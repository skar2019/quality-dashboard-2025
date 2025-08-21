import argparse
from langchain_community.vectorstores import Chroma
from langchain_community.embeddings import OllamaEmbeddings
from langchain_community.llms import Ollama

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Run RAG query on Jira tasks')
    parser.add_argument('query', type=str, help='The query to search for in Jira tasks')
    parser.add_argument('--k', type=int, default=3, help='Number of similar documents to retrieve (default: 3)')
    parser.add_argument('--sprint', type=str, help='Filter by sprint (e.g., Sprint-1, Sprint-2, Sprint-3)')
    parser.add_argument('--project', type=str, help='Filter by project (e.g., Adani)')
    
    args = parser.parse_args()

    embeddings = OllamaEmbeddings(model="nomic-embed-text")
    llm = Ollama(model="llama3")  # Updated to llama3

    vectorstore = Chroma(persist_directory="./jira_tasks_chroma_db", embedding_function=embeddings)

    query = args.query
    
    # If sprint filter is specified, get all documents and filter by sprint
    if args.sprint:
        # Get all documents from the vectorstore
        all_docs = vectorstore.get()
        filtered_docs = []
        
        for i, doc in enumerate(all_docs['documents']):
            metadata = all_docs['metadatas'][i]
            if metadata.get('sprint_id') == args.sprint:
                # Create a Document object for the filtered result
                from langchain.docstore.document import Document
                filtered_docs.append(Document(page_content=doc, metadata=metadata))
        
        # If we have a specific query, filter the sprint results by query content
        if query.lower() != "show all tasks" and query.lower() != "list all tasks":
            # Filter by query keywords
            query_lower = query.lower()
            priority_filtered_docs = []
            
            for doc in filtered_docs:
                content_lower = doc.page_content.lower()
                # Check for priority-related keywords
                if any(keyword in query_lower for keyword in ['high priority', 'priority high', 'high']):
                    if 'priority: high' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['medium priority', 'priority medium', 'medium']):
                    if 'priority: medium' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['low priority', 'priority low', 'low']):
                    if 'priority: low' in content_lower:
                        priority_filtered_docs.append(doc)
                # Check for status-related keywords
                elif any(keyword in query_lower for keyword in ['done', 'completed', 'finished']):
                    if 'status: done' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['in progress', 'progress']):
                    if 'status: in progress' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['to do', 'todo', 'pending']):
                    if 'status: to do' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['in review', 'review']):
                    if 'status: in review' in content_lower:
                        priority_filtered_docs.append(doc)
                # Check for issue type keywords
                elif any(keyword in query_lower for keyword in ['bug', 'bugs']):
                    if 'issue type: bug' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['story', 'stories']):
                    if 'issue type: story' in content_lower:
                        priority_filtered_docs.append(doc)
                elif any(keyword in query_lower for keyword in ['task', 'tasks']):
                    if 'issue type: task' in content_lower:
                        priority_filtered_docs.append(doc)
                else:
                    # If no specific filter matches, include all docs
                    priority_filtered_docs.append(doc)
            
            docs = priority_filtered_docs
        else:
            docs = filtered_docs
        
        print(f"Found {len(docs)} tasks in {args.sprint}")
    else:
        # Use semantic search for regular queries
        query_embedding = embeddings.embed_query(query)
        docs = vectorstore.similarity_search_by_vector(query_embedding, k=args.k)
    
    if not docs:
        print("No tasks found matching the criteria.")
        return
    
    context = "\n\n".join([doc.page_content for doc in docs])
    prompt = f"Context:\n{context}\n\nQuery: {query}\nAnswer in a concise manner:"
    response = llm.invoke(prompt)

    print("Retrieved Tasks:")
    for doc in docs:
        print(doc.page_content)
        print("---")
    print(f"\nTotal tasks retrieved: {len(docs)}")
    print("\nRAG Response:")
    print(response)

if __name__ == "__main__":
    main()
# 🔍 RAG Search Flow Diagram

## Complete Search Process for "Show bugs in Sprint-2"

```mermaid
flowchart TD
    A[User Query: "Show bugs in Sprint-2"] --> B[Query Analysis]
    B --> C{Has Sprint Filter?}
    
    C -->|Yes| D[Sprint-First Retrieval Path]
    C -->|No| E[Semantic Search Path]
    
    %% Sprint-First Path
    D --> D1[Get ALL documents from Vector DB]
    D1 --> D2[Filter by Sprint ID = "Sprint-2"]
    D2 --> D3{Has Project Filter?}
    D3 -->|Yes| D4[Filter by Project ID = "adani"]
    D3 -->|No| D5[Skip Project Filtering]
    D4 --> D6[Apply Dynamic K Limit]
    D5 --> D6
    
    %% Semantic Search Path
    E --> E1[Generate Embeddings for Query]
    E1 --> E2[Vector Similarity Search]
    E2 --> E3[Get Top K Results]
    E3 --> E4[Apply Metadata Filters]
    
    %% Common Filtering Pipeline
    D6 --> F[Intelligent Filtering Pipeline]
    E4 --> F
    
    F --> F1[Sprint Filter Check]
    F1 --> F2[Project Filter Check]
    F2 --> F3[Issue Type Filter Check]
    F3 --> F4[Priority Filter Check]
    F4 --> F5[Status Filter Check]
    
    %% Issue Type Filtering (NEW)
    F3 --> F3a{Query contains 'bug'?}
    F3a -->|Yes| F3b[Keep only issue_type = 'bug']
    F3a -->|No| F3c[Check for other issue types]
    F3b --> F4
    F3c --> F4
    
    %% Priority Filtering
    F4 --> F4a{Query contains priority keywords?}
    F4a -->|Yes| F4b[Filter by priority level]
    F4a -->|No| F4c[Skip priority filtering]
    F4b --> F5
    F4c --> F5
    
    %% Status Filtering
    F5 --> F5a{Query contains status keywords?}
    F5a -->|Yes| F5b[Filter by status]
    F5a -->|No| F5c[Skip status filtering]
    F5b --> G[Create TaskData Objects]
    F5c --> G
    
    %% Task Creation
    G --> G1[Parse Document Content]
    G1 --> G2[Extract Metadata]
    G2 --> G3[Create TaskData Objects]
    
    %% Final Validation
    G3 --> H[Final Validation & Filtering]
    H --> H1{Query Type Detection}
    
    H1 -->|Bug Query| H2[Filter to Bug Tasks Only]
    H1 -->|Priority Query| H3[Filter to Priority Tasks Only]
    H1 -->|Status Query| H4[Filter to Status Tasks Only]
    H1 -->|General Query| H5[Return All Filtered Tasks]
    
    %% Result Return
    H2 --> I[Return Filtered Results]
    H3 --> I
    H4 --> I
    H5 --> I
    
    I --> J[Final Result: 3 Bug Tasks from Sprint-2 in Adani Project]
    
    %% Styling
    classDef startEnd fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef process fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef decision fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef filter fill:#e8f5e8,stroke:#1b5e20,stroke-width:2px
    classDef result fill:#fce4ec,stroke:#880e4f,stroke-width:2px
    
    class A,J startEnd
    class B,D1,D2,D4,D6,E1,E2,E3,E4,G1,G2,G3 process
    class C,D3,F3a,F4a,F5a,H1 decision
    class F1,F2,F3,F4,F5,F3b,F4b,F5b filter
    class I result
```

## 🔄 **Detailed Process Flow**

### **Phase 1: Query Analysis & Routing**
```
User Query: "Show bugs in Sprint-2"
├── Sprint Filter: "Sprint-2" ✅
├── Project Filter: "adani" ✅  
├── Issue Type: "bug" ✅
└── Route: Sprint-First Retrieval Path
```

### **Phase 2: Document Retrieval**
```
Sprint-First Path:
├── Get ALL documents from Chroma Vector DB
├── Filter by sprint_id = "Sprint-2"
├── Filter by project_id = "adani"
└── Apply dynamic_k limit (15 for sprint + bug)
```

### **Phase 3: Intelligent Filtering Pipeline**
```
Multi-Layer Filtering:
├── Sprint Filter: Only Sprint-2 tasks
├── Project Filter: Only Adani project tasks
├── Issue Type Filter: Only bug tasks
├── Priority Filter: All priorities (no restriction)
└── Status Filter: All statuses (no restriction)
```

### **Phase 4: Final Validation**
```
Quality Assurance:
├── Count bug tasks vs total tasks
├── If mismatch: Filter out non-bug tasks
├── Log filtering actions
└── Return only validated bug tasks
```

## 🎯 **Key Decision Points**

### **1. Retrieval Strategy Selection**
- **Sprint-First**: When sprint_filter is provided
- **Semantic Search**: When no sprint_filter

### **2. Dynamic K Calculation**
```python
if sprint_filter and 'bug' in query:
    dynamic_k = min(15, total_docs)  # Sprint + Bug queries
elif 'bug' in query:
    dynamic_k = min(10, total_docs)  # Bug queries only
else:
    dynamic_k = min(15, total_docs)  # Default
```

### **3. Filter Application Order**
1. **Sprint Filter** (Database level)
2. **Project Filter** (Metadata level)
3. **Issue Type Filter** (Content level)
4. **Priority Filter** (Metadata level)
5. **Status Filter** (Metadata level)

## 🔧 **Technical Components**

### **Vector Database**
- **Chroma DB** with persistent storage
- **nomic-embed-text** embeddings
- **Metadata indexing** for fast filtering

### **Search Methods**
- **Exact filtering** for sprint/project
- **Semantic search** for content relevance
- **Hybrid approach** for optimal results

### **Filter Types**
- **Database filters**: sprint_id, project_id
- **Content filters**: issue_type, priority, status
- **Query-based filters**: dynamic application

## 📊 **Result Flow Example**

```
Input: "Show bugs in Sprint-2"
├── Sprint Filter: Sprint-2
├── Project Filter: adani
├── Issue Type: bug
├── Initial Results: 22 tasks
├── After Sprint Filter: 8 tasks
├── After Project Filter: 6 tasks
├── After Issue Type Filter: 3 tasks
└── Final Validation: 3 bug tasks ✅
```

## 🚀 **Why This is True RAG**

1. **No Hardcoded Data**: All results come from vector database
2. **Semantic Understanding**: Uses embeddings for meaning-based search
3. **Dynamic Filtering**: Applies filters based on actual query content
4. **Real-time Results**: No predefined response templates
5. **Intelligent Routing**: Chooses optimal search strategy
6. **Quality Assurance**: Final validation ensures accuracy

This flow diagram shows how the system intelligently routes queries, applies multiple filtering layers, and ensures that only relevant, accurate results are returned - all driven by the RAG system and vector database!

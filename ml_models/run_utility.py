#!/usr/bin/env python3
"""
Utility Script Runner
Easily run utility scripts from the main ml_models directory
"""

import sys
import os
import subprocess
from pathlib import Path

def main():
    if len(sys.argv) < 2:
        print("Usage: python run_utility.py <utility_script> [args...]")
        print("\nAvailable utilities:")
        print("  add_data_to_vector_db.py     - Add data to vector database")
        print("  check_vector_db_records.py   - Check records and details")
        print("  clear_chromadb_embeddings.py - Clear all embeddings")
        return
    
    utility_script = sys.argv[1]
    args = sys.argv[2:] if len(sys.argv) > 2 else []
    
    # Define available utilities
    utilities = {
        "add_data_to_vector_db.py": "utils/add_data_to_vector_db.py",
        "check_vector_db_records.py": "utils/check_vector_db_records.py", 
        "clear_chromadb_embeddings.py": "utils/clear_chromadb_embeddings.py"
    }
    
    if utility_script not in utilities:
        print(f"❌ Unknown utility: {utility_script}")
        print("Available utilities:", list(utilities.keys()))
        return
    
    script_path = utilities[utility_script]
    
    # Check if script exists
    if not os.path.exists(script_path):
        print(f"❌ Script not found: {script_path}")
        return
    
    # Run the utility script
    print(f"🚀 Running {utility_script}...")
    try:
        result = subprocess.run([sys.executable, script_path] + args, 
                              cwd=os.getcwd(), 
                              check=True)
        print(f"✅ {utility_script} completed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ {utility_script} failed with exit code {e.returncode}")
        sys.exit(e.returncode)

if __name__ == "__main__":
    main()

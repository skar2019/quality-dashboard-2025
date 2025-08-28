import React, { useState, useEffect } from 'react';
import AddProjectAdminModal from './project-admin-management/AddProjectAdminModal';
import EditProjectAdminModal from './project-admin-management/EditProjectAdminModal';
import DeleteConfirmationModal from './project-admin-management/DeleteConfirmationModal';
import './../../style/projectAdmin.css';

interface ProjectAdmin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

const ProjectAdminList: React.FC = () => {
  const [admins, setAdmins] = useState<ProjectAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<ProjectAdmin | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<ProjectAdmin | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    // Fetch current user from session endpoint
    const fetchSessionUser = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/session`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          // Now fetch admins
          fetchProjectAdmins();
        } else {
          setCurrentUser(null);
        }
      } catch (err) {
        setCurrentUser(null);
      }
    };
    fetchSessionUser();
  }, []);

  const fetchProjectAdmins = async () => {
    try {
              const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3008'}/api/user/project-admins`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Received project admins data:', data);
        setAdmins(data);
      } else {
        const errorData = await response.json();
        console.error('❌ Failed to fetch project admins:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching project admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSuccess = (newAdmin: ProjectAdmin) => {
    console.log('✨ Adding new admin:', newAdmin);
    setAdmins([newAdmin, ...admins]);
    setShowAddModal(false);
  };

  const handleEditSuccess = (updatedAdmin: ProjectAdmin) => {
    console.log('✏️ Updating admin:', updatedAdmin);
    setAdmins(admins.map(admin => 
      admin.id === updatedAdmin.id ? updatedAdmin : admin
    ));
    setEditingAdmin(null);
  };

  const handleDeleteSuccess = (deletedAdminId: string) => {
    console.log('🗑️ Deleting admin with ID:', deletedAdminId);
    setAdmins(admins.filter(admin => admin.id !== deletedAdminId));
    setDeletingAdmin(null);
  };

  if (loading) {
    return <div className="loading">Loading project admins...</div>;
  }

  return (
    <div className="project-admin-container">
      <div className="project-admin-header-bar">
        <span>Project Admin Management</span>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          Add Project Admin
        </button>
      </div>

      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => {
              console.log('🔍 Rendering admin:', admin);
              return (
                <tr key={admin.id}>
                  <td>{admin.name || 'No name'}</td>
                  <td>{admin.email}</td>
                  <td>{new Date(admin.createdAt).toLocaleDateString()}</td>
                  <td>
                    <button 
                      className="btn btn-edit"
                      onClick={() => setEditingAdmin(admin)}
                    >
                      Edit
                    </button>
                    {currentUser?.userType === 'super_admin' && (
                      <button 
                        className="btn btn-delete"
                        onClick={() => setDeletingAdmin(admin)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {admins.length === 0 && (
          <div className="no-data">No project administrators found.</div>
        )}
      </div>

      {/* Modals */}
      <AddProjectAdminModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={handleAddSuccess}
      />

      {editingAdmin && (
        <EditProjectAdminModal
          open={!!editingAdmin}
          admin={editingAdmin}
          onClose={() => setEditingAdmin(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {deletingAdmin && (
        <DeleteConfirmationModal
          open={!!deletingAdmin}
          admin={deletingAdmin}
          onClose={() => setDeletingAdmin(null)}
          onSuccess={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default ProjectAdminList;
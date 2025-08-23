import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './../../style/login.css';
import { Box } from '@mui/material';

interface LoginData {
    email : string;
    password : string;
}

const Login: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<LoginData>({
        email : '',
        password : ''
    });
    const [error, setError] = useState<LoginData>({
        email : '',
        password : ''
    });

    // Debug environment variables on component mount
    useEffect(() => {
        console.log('🔧 Environment Variables Debug:');
        console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
        console.log('NODE_ENV:', process.env.NODE_ENV);
        console.log('All env vars:', process.env);
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [name]: value
        }));
    };

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();

        if(validateInput()) {
            // Debug logging
            console.log('🔍 Login Debug Info:');
            console.log('Environment API URL:', process.env.REACT_APP_API_URL);
            console.log('Full Login URL:', `${process.env.REACT_APP_API_URL}/api/user/login`);
            console.log('Login credentials:', { email: formData.email, password: '***' });
            
            try {
                const response = await fetch(`${process.env.REACT_APP_API_URL}/api/user/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: formData.email, password: formData.password }),
                    credentials: 'include'
                });
                
                console.log('🔍 Login Response Status:', response.status);
                console.log('🔍 Login Response Headers:', response.headers);
                
                const user = await response.json();
                console.log('🔍 Login Response Data:', user);
                
                if (response.ok) {
                    console.log('✅ Login successful, navigating to dashboard');
                    navigate('/dashboard');
                } else {
                    console.error('❌ Login failed:', user.message);
                    alert(user.message || 'Login failed. Please try again.');
                }
            } catch (error) {
                console.error('❌ Login request failed:', error);
                alert('Network error. Please check your connection and try again.');
            }
        }
    };

    const validateInput = () => {
        let errorCount = 0;
        setError((prevState) => {
            const newState = { ...prevState };
            if (!formData.email) {
                newState.email = 'Please enter Email.';
                errorCount++;
            } else {
                newState.email = '';
            }
            if (!formData.password) {
                newState.password = 'Please enter Password.';
                errorCount++;
            } else {
                newState.password = '';
            }
            return newState;
        });
        return errorCount === 0;
    }

    return (
        <div className="login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="logo" style={{ background: 'none', boxShadow: 'none' }}>
                        <svg width="60" height="60" viewBox="0 0 512 512" fill="none">
                            <rect width="512" height="512" rx="100" fill="#FA0F00"/>
                            <polygon fill="#fff" points="256,120 120,392 192,392 256,256 320,392 392,392"/>
                        </svg>
                    </div>
                    <h1 className="login-title">Quality Dashboard</h1>
                    <p className="login-subtitle">Sign in to access your dashboard</p>
                </div>
                
                <form className="login-form" onSubmit={handleSignIn}>
                    <Box display="flex" flexDirection="column" alignItems="center" mb={2}>
                        <span style={{ fontSize: 22, color: '#FA0F00', marginBottom: 4 }}>
                            <i className="fas fa-user-circle" style={{ marginRight: 8 }}></i>
                            Welcome back!
                        </span>
                        <span style={{ color: '#6B6B6B', fontSize: 15 }}>
                            Please enter your credentials to continue.
                        </span>
                    </Box>
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <div className="input-wrapper">
                            <i className="input-icon fas fa-envelope"></i>
                            <input 
                                type="email" 
                                className="form-input" 
                                name="email" 
                                placeholder="Enter your email" 
                                onChange={handleInputChange}
                                value={formData.email}
                            />
                        </div>
                        {error.email && <div className="error-message">{error.email}</div>}
                    </div>
                    
                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <div className="input-wrapper">
                            <i className="input-icon fas fa-lock"></i>
                            <input 
                                type="password" 
                                className="form-input" 
                                name="password" 
                                placeholder="Enter your password" 
                                onChange={handleInputChange}
                                value={formData.password}
                            />
                        </div>
                        {error.password && <div className="error-message">{error.password}</div>}
                    </div>
                    
                    <button type="submit" className="login-button">
                        <span>Sign In</span>
                        <i className="fas fa-arrow-right"></i>
                    </button>
                </form>
            </div>
        </div>
    )
}

export default Login;


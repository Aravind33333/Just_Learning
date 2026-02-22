import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL; // Defaulting to common local .NET port
function SignUpPages() {
    const [Name, setName] = useState("");
    const [Email, setEmail] = useState("");
    const [PasswordHash, setPasswordHash] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "Name") {
            setName(value);
        } else if (name === "Email") {
            setEmail(value);
        } else if (name === "PasswordHash") {
            setPasswordHash(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log(Name, Email, PasswordHash);
        try {
            const response = await axios.post(`${API_URL}/api/user/register`, { Name, Email, PasswordHash });
            // Store the new UserID so AccountSetup can link the account details
            sessionStorage.setItem("userId", response.data.userId);
            console.log("User registered! UserID:", response.data.userId);
            window.location.href = "/AccountSetup";
        } catch (error) {
            console.error("Error creating user", error);
            alert(error.response?.data?.message || "Sign up failed.");
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-header">
                <h1>Create Account</h1>
                <p>Join us to start, Your Banking Experience much better!</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <input type="text" name="Name" placeholder="Name" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <input type="email" name="Email" placeholder="Email" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <input type="password" name="PasswordHash" placeholder="Password" onChange={handleChange} required />
                </div>
                <button type="submit" className="btn-primary">Sign Up</button>
            </form>
            <div className="auth-footer">
                <p>Already have an account? <a href="/SignInPage">Sign In</a></p>
            </div>
        </div>
    );
}

export default SignUpPages;
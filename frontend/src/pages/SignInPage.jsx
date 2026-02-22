import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function SignInPage() {
    const [Email, setEmail] = useState("");
    const [Password, setPassword] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "Email") {
            setEmail(value);
        } else if (name === "Password") {
            setPassword(value);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${API_URL}/api/user/login`, { Email, Password });
            sessionStorage.setItem("userId", response.data.userId);
            sessionStorage.setItem("accountId", response.data.accountId ?? "");
            sessionStorage.setItem("userName", response.data.name);
            console.log("Login Successful!", response.data);
            window.location.href = "/Dashboard";
        } catch (error) {
            console.error("Login failed", error);
            alert(error.response?.data?.message || "Invalid email or password");
        }
    };
    return (
        <div className="auth-container">
            <div className="auth-header">
                <h1>Welcome Back</h1>
                <p>Sign in to your account to continue</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <input type="email" name="Email" placeholder="Email Address" onChange={handleChange} required />
                </div>
                <div className="form-group">
                    <input type="password" name="Password" placeholder="Password" onChange={handleChange} required />
                </div>
                <button type="submit" className="btn-primary">Sign In</button>
            </form>
            <div className="auth-footer">
                <p>Don't have an account? <a href="/SignUpPages">Sign Up</a></p>
            </div>
        </div>
    );
}

export default SignInPage;
import { useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

function AccountSetup() {
    // Read the UserID saved into sessionStorage right after Sign Up
    const UserID = parseInt(sessionStorage.getItem("userId") || "0");

    const [FirstName, setFirstName] = useState("");
    const [LastName, setLastName] = useState("");
    const [PhoneNumber, setPhoneNumber] = useState("");
    const [Address, setAddress] = useState("");
    const [City, setCity] = useState("");
    const [State, setState] = useState("");
    const [ZipCode, setZipCode] = useState("");
    const [InitialDeposit, setInitialDeposit] = useState("");
    const [PIN, setPIN] = useState("");
    const [ConfirmPIN, setConfirmPIN] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "FirstName") setFirstName(value);
        else if (name === "LastName") setLastName(value);
        else if (name === "PhoneNumber") setPhoneNumber(value);
        else if (name === "Address") setAddress(value);
        else if (name === "City") setCity(value);
        else if (name === "State") setState(value);
        else if (name === "ZipCode") setZipCode(value);
        else if (name === "InitialDeposit") setInitialDeposit(value);
        else if (name === "PIN") setPIN(value);
        else if (name === "ConfirmPIN") setConfirmPIN(value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (PIN !== ConfirmPIN) {
            alert("PINs do not match!");
            return;
        }
        if (!UserID) {
            alert("Session expired. Please sign up again.");
            window.location.href = "/SignUpPages";
            return;
        }

        try {
            const response = await axios.post(`${API_URL}/api/user/accountsetup`, {
                UserID, FirstName, LastName, PhoneNumber,
                Address, City, State, ZipCode,
                InitialDeposit: parseFloat(InitialDeposit),
                PIN, ConfirmPIN
            });
            // Store accountId so Dashboard deposit/withdraw buttons work
            sessionStorage.setItem("accountId", response.data.accountId);
            sessionStorage.removeItem("userId"); // clean up registration temp id
            alert("Account Setup complete! You can now sign in.");
            window.location.href = "/SignInPage";
        } catch (error) {
            console.error("Account setup error", error);
            alert(error.response?.data?.message || "Account setup failed.");
        }
    };

    return (
        <div className="auth-container wide">
            <div className="auth-header">
                <h1>Complete Setup</h1>
                <p>Last step to complete your account setup</p>
            </div>
            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-grid">
                    <div className="form-group">
                        <label>First Name</label>
                        <input type="text" name="FirstName" placeholder="Sam" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Last Name</label>
                        <input type="text" name="LastName" placeholder="Nick" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Phone Number</label>
                        <input type="tel" name="PhoneNumber" placeholder="+1 (555) 000-0000" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>City</label>
                        <input type="text" name="City" placeholder="New York" onChange={handleChange} required />
                    </div>
                    <div className="form-group full-width">
                        <label>Address</label>
                        <input type="text" name="Address" placeholder="123 Main St" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>State</label>
                        <input type="text" name="State" placeholder="NY" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Zip Code</label>
                        <input type="text" name="ZipCode" placeholder="10001" onChange={handleChange} required />
                    </div>
                    <div className="form-group full-width">
                        <label>Initial Deposit</label>
                        <input type="number" name="InitialDeposit" placeholder="$0.00" onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Set PIN</label>
                        <input type="password" name="PIN" placeholder="4-digit PIN" maxLength={6} onChange={handleChange} required />
                    </div>
                    <div className="form-group">
                        <label>Confirm PIN</label>
                        <input type="password" name="ConfirmPIN" placeholder="Confirm PIN" maxLength={6} onChange={handleChange} required />
                    </div>
                </div>
                <button type="submit" className="btn-primary">Complete Account Setup</button>
            </form>
        </div>
    );
}

export default AccountSetup;
import React from 'react';
import Login from './Login';
import { message } from 'antd';

function App() {
  const authenticateUser = (email, password) => {
    // Dummy authentication
    if (email === 'user@example.com' && password === 'password') {
      message.success('Login successful!');
    } else {
      message.error('Invalid credentials!');
    }
  };

  const requestAccount = async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  };


  return (
    <div>
      <Login />
    </div>
  );
}

export default App;

import React, { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import axios from 'axios';
import 'antd/dist/reset.css';
import { ethers, BrowserProvider } from "ethers";

function Login() {
  const [loading, setLoading] = useState(false);

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const response = await axios.post('http://localhost:8000/api/login', {
        email: values.email,
        password: values.password,
      });
      message.success(response.data.message);
    } catch (error) {
      message.error('Invalid credentials!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Button>Connect wallet</Button>
    </div>
  );
}

export default Login;

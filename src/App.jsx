import React, { useEffect, useState } from 'react';
import { message, Button } from 'antd';
import { ITEM_CONTRACT_ADDRESS } from "../utils";
import { useNavigate } from 'react-router-dom';

function App() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          // Check if the wallet is already connected
          const accounts = await window.ethereum.request({ method: "eth_accounts" });
          console.log(accounts)
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            navigate("/home")
          } else {
            // Request connection if not connected
            const newAccounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            setAccount(newAccounts[0]);
            navigate("/home")
          }
          // navigate('/home')
        } catch (error) {
          console.error("Error connecting to wallet:", error);
          message.error("Error connecting to wallet. Please try again.");
        }
      } else {
        message.error("No Ethereum provider found. Please install MetaMask.");
      }
    };

    checkWalletConnection();
  }, []);

  return (
    <div>
      <Button>Connect wallet</Button>
      <h1>Wallet Connection</h1>
      <p>Wallet Address: {account ? account : "Not connected"}</p>
      <p>Item Contract Address: {ITEM_CONTRACT_ADDRESS}</p>
    </div>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import { ITEM_CONTRACT_ADDRESS } from "../utils";
import { API_URL } from '../utils';
import { ethers } from "ethers";
import Item from "./artifacts/contracts/Item.sol/Item.json";
import Escrow from "./artifacts/contracts/Escrow.sol/Escrow.json"
import axios from 'axios'
import { useNavigate } from 'react-router-dom';
import { Menu, Row, Col, Form, Input, Button, Modal, message, Upload, Card, Tooltip, Tag, Drawer, Popconfirm } from 'antd';

function App() {
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [openedDisputeItems, setOpenedDisputeItems] = useState([]);
    const [current, setCurrent] = useState('myItems');

    useEffect(() => {
        const checkWalletConnection = async () => {
          if (typeof window.ethereum !== "undefined") {
            const provider = new ethers.providers.Web3Provider(window.ethereum);
    
            try {
              const acc = await provider.send("eth_requestAccounts", []);
              setAccount(acc[0]);
    
              const signer = provider.getSigner();
              const itemContract = new ethers.Contract(ITEM_CONTRACT_ADDRESS, Item.abi, signer);
              setContract(itemContract);
    
            } catch (error) {
              console.log('Error checking wallet connection:', error);
              navigate("/arbitrator");
            }
          } else {
            message.error('Please install MetaMask!');
          }
        };   
        checkWalletConnection();
        retrieveUsersItems();
    }, []);

    const handleError = (error) => {
        if(error.code === 'ACTION_REJECTED') {
          message.error('Action rejected by user')
        } else {
          console.log('Failed to delete item ' + error);
          message.error(error.error.data.message);  
        }
    }    

    const retrieveUsersItems = async () => {
        if (contract) {
          try {
            const items = await contract.getItemsWithDispute();
            const updatedItems = await Promise.all(
              items.map(async item => {
                try {
                  const response = await axios.get(`http://localhost:8080/api/images/${item.image}`, {
                    responseType: 'blob', // Ensure we treat the response as a binary file
                  });
      
                  const imageUrl = URL.createObjectURL(response.data);
      
                  // Add the new image URL key to the item
                  return {
                    ...item,
                    imageUrl, // Add the image URL as a new key
                  };
                } catch (error) {
                  console.error(`Error fetching image for item ${item.id}:`, error);
                  return {
                    ...item,
                    imageUrl: null, // Handle the case where the image couldn't be fetched
                  };
                }
              })
            );
            setOpenedDisputeItems(updatedItems);
          } catch (error) {
            handleError(error);
          }
        }
    };

    return (
        <>
            <Row>
                {openedDisputeItems.map((item, index) => (
                    <Col span={8} key={index}>
                        <Card
                            hoverable
                            style={{
                                width: 240,
                            }}
                            cover={<img alt="example" src={item.imageUrl} />}
                        >
                            <Meta title={item.title} description={item.description} />
                            <Meta title={`${item.price.toString()} ETH`} />
                        </Card>
                    </Col>
                ))}
            </Row>
        </>
    );
}

export default App;

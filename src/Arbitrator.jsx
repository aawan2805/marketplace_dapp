import React, { useState, useEffect } from 'react';
import { ITEM_CONTRACT_ADDRESS } from "../utils";
import { API_URL } from '../utils';
import { ethers } from "ethers";
import Item from "./artifacts/contracts/Item.sol/Item.json";
import Escrow from "./artifacts/contracts/Escrow.sol/Escrow.json"
import axios from 'axios'
import { useNavigate } from 'react-router-dom';
import { Menu, Row, Col, Form, Input, Button, Modal, message, Upload, Card, Tooltip, Tag, Drawer, Popconfirm } from 'antd';
import { UserOutlined, ShoppingCartOutlined, LogoutOutlined, UploadOutlined, PlusOutlined, CloseOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';

function App() {
    const { Meta } = Card;
    const navigate = useNavigate();
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState(null);
    const [openedDisputeItems, setOpenedDisputeItems] = useState([]);
    const [current, setCurrent] = useState('myItems');
    const [openHistoryModal, setOpenHistoryModal] = useState(false);
    const [item, setItem] = useState([]);

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

                  let imageUrlSeller = null;
                  let imageUrlBuyer = null;    
                  const history = await getItemHistory(item);
                  if(history[1] !== "") {
                    const responseSellerProof = await axios.get(`http://localhost:8080/api/images/${history[1]}`, {
                      responseType: 'blob', // Ensure we treat the response as a binary file
                    });
                    imageUrlSeller = URL.createObjectURL(responseSellerProof.data);  
                  }
                  if(history[2] !== "") {
                    const responseBuyerProof = await axios.get(`http://localhost:8080/api/images/${history[2]}`, {
                      responseType: 'blob', // Ensure we treat the response as a binary file
                    });
                    imageUrlBuyer = URL.createObjectURL(responseBuyerProof.data);  
                  }
                  // Add the new image URL key to the item
                  return {
                    ...item,
                    imageUrl, // Add the image URL as a new key
                    history,
                    imageUrlSeller,  // Add imageUrlSeller to the data
                    imageUrlBuyer,   // Add imageUrlBuyer to the data    
                  };
                } catch (error) {
                  console.error(`Error fetching image for item ${item.id}:`, error);
                  return {
                    ...item,
                    imageUrl: null, // Handle the case where the image couldn't be fetched
                    history: [],
                    imageUrlSeller: null,  // Add imageUrlSeller to the data
                    imageUrlBuyer: null,   // Add imageUrlBuyer to the data
    
                  };
                }
              })
            );
            console.log(updatedItems)
            setOpenedDisputeItems(updatedItems);
          } catch (error) {
            handleError(error);
          }
        }
    };

    const getItemHistory = async (item) => {
        const { escrow } = item;
        if (!escrow || escrow === ethers.constants.AddressZero) {
          return null;
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer);
    
        try {
          const transaction = await escrowContract.getDisputeHistory();
          console.log(transaction)
          return transaction;
        } catch (error) {
          handleError(error);
        }
    }

    const changeHistoryState = (item) => {
        setItem(item);
        setOpenHistoryModal(true);
    }    

    const refund = async (item, buyer) => {
        const { escrow } = item;
        if (!escrow || escrow === ethers.constants.AddressZero) {
            return null;
        }
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer);

        try {
            if(buyer === true) {
                // Refund buyer
                const transaction = await escrowContract.resolveDispute(true);
                message.success("Buyer was refunded.")
            } else {
                const transaction = await escrowContract.resolveDispute(false);
                message.success("Seller was refunded.")
            }
        } catch (error ) {
            handleError(error);
        }

    }

    return (
        <>
        <Row>
            <Drawer title="History" onClose={() => setOpenHistoryModal(false)} open={openHistoryModal}>
                {item !== null && item !== undefined && item.history !== undefined && item.history[0].map(i => (
                    <>
                    <p>{i}</p>
                    <br />
                    </>
                ))}
                {item.imageUrlBuyer !== "" && 
                    <>
                    <p>Buyer proof:</p>
                    <img src={item.imageUrlBuyer} />
                    </>
                }
                {item.imageUrlBuyer !== "" && 
                    <>
                    <p>Seller proof:</p>
                    <img src={item.imageUrlBuyer} />
                    </>
                }
            </Drawer>
            </Row>
            <Row>
                {openedDisputeItems.map((item, index) => (
                    <Col span={8} key={index}>
                        <Card
                            hoverable
                            style={{
                                width: 240,
                            }}
                            cover={<img alt="example" src={item.imageUrl} />}
                            actions={[
                                <HistoryOutlined onClick={() => changeHistoryState(item)} />,
                            ]}
                        >
                            <Meta title={item.title} description={item.description} />
                            <Meta title={`${item.price.toString()} ETH`} />
                            <Button onClick={() => refund(item, true)}>Refund buyer</Button>,
                            <Button onClick={() => refund(item, false)}>Refund seller</Button>

                        </Card>
                    </Col>
                ))}
            </Row>
        </>
    );
}

export default App;

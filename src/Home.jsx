import React, { useState, useEffect } from 'react';
import { UserOutlined, ShoppingCartOutlined, LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import { Menu, Row, Col, Form, Input, Button, Modal, message } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ITEM_CONTRACT_ADDRESS } from "../utils";
import { ethers } from "ethers";
import Item from "./artifacts/contracts/Item.sol/Item.json";

const { TextArea } = Input;

const items = [
  {
    label: 'My Items',
    key: 'myItems',
    icon: <UserOutlined />,
  },
  {
    label: 'My Purchases',
    key: 'myPurchases',
    icon: <ShoppingCartOutlined />,
  },
  {
    label: 'Disconnect',
    key: 'disconnect',
    icon: <LogoutOutlined />,
  }
];

function App() {
    const navigate = useNavigate();
    const [current, setCurrent] = useState('myItems');
    const [account, setAccount] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [contract, setContract] = useState(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();

    // Request access to User's MetaMask account
    const requestAccount = async () => {
        await window.ethereum.request({ method: "eth_requestAccounts" });
    };

    useEffect(() => {
        const checkWalletConnection = async () => {
            if (window.ethereum) {
                try {
                    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                    if (accounts.length > 0) {
                        setAccount(accounts[0]);
                        setIsConnected(true);

                        // Initialize contract
                        const web3Provider = new ethers.BrowserProvider(window.ethereum);
                        const itemContract = new ethers.Contract(
                            ITEM_CONTRACT_ADDRESS,
                            Item.abi,
                            web3Provider
                        );
                        setContract(itemContract);
                    } else {
                        navigate("/");
                    }
                } catch (error) {
                    console.error('Error checking wallet connection:', error);
                    setIsConnected(false);
                    navigate("/");
                }
            } else {
                message.error('Please install MetaMask!');
            }
        };
        checkWalletConnection();
    }, [navigate]);

    const handleFinish = async (values) => {
        if (!contract || !account) {
            message.error('Wallet not connected');
            return;
        }

        const { title, description, price, image } = values;
        if (typeof window.ethereum !== "undefined") {
            try {
                await requestAccount();
                const web3Provider = new ethers.BrowserProvider(window.ethereum);
                const signer = await web3Provider.getSigner();
                const itemContract = new ethers.Contract(
                    ITEM_CONTRACT_ADDRESS,
                    Item.abi,
                    signer
                );

                const transaction = await itemContract.addItem(title, description, ethers.parseUnits(price.toString(), 'ether'), image);
                await transaction.wait();

                message.success('Item added successfully');
                form.resetFields();
                setIsModalVisible(false);    
            } catch (error) {
                console.error('Error adding item:', error);
                message.error('Failed to add item');       
            }
        }
    };

    const handleModalOpen = () => {
        setIsModalVisible(true);
    };

    const handleModalCancel = () => {
        setIsModalVisible(false);
    };

    const retrieveUserItems = async () => {
        if (contract) {
            try {
                const data = await contract.retrieveUserItems();
                console.log(`Data: ${data}`);
            } catch (error) {
                console.error(error);
            }
        }
    };

    const onClick = async (e) => {
        setCurrent(e.key);
        if (e.key === 'disconnect') {
            await window.ethereum.request({ method: 'eth_requestAccounts', params: [{ eth_accounts: {} }] });
            navigate("/");
        } else if (e.key === 'myItems') {
            await retrieveUserItems();
        }
    };

    return (
        <>
            <Row>
                <Col span={24}>
                    <Menu 
                        onClick={onClick} 
                        selectedKeys={[current]} 
                        mode="horizontal" 
                        theme="dark"
                        items={items} 
                    />
                    <Button 
                        type="primary" 
                        icon={<PlusOutlined />} 
                        style={{ margin: '16px' }} 
                        onClick={handleModalOpen}
                    >
                        Add Item
                    </Button>
                </Col>
            </Row>
            <Modal
                title="Add New Item"
                open={isModalVisible}
                onCancel={handleModalCancel}
                footer={null}
            >
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleFinish}
                >
                    <Form.Item name="title" label="Title" rules={[{ required: true, message: 'Please enter the title' }]}>
                        <Input placeholder="Item title" />
                    </Form.Item>

                    <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Please enter the description' }]}>
                        <TextArea rows={4} placeholder="Item description" />
                    </Form.Item>

                    <Form.Item name="price" label="Price (in ETH)" rules={[{ required: true, message: 'Please enter the price' }]}>
                        <Input type="number" placeholder="Item price" />
                    </Form.Item>

                    <Form.Item name="image" label="Image URL" rules={[{ required: true, message: 'Please enter the image URL' }]}>
                        <Input placeholder="Item image URL" />
                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">
                            Add Item
                        </Button>
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default App;

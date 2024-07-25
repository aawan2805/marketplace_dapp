import React, { useState, useEffect } from 'react';
import { UserOutlined, ShoppingCartOutlined, LogoutOutlined, PlusOutlined } from '@ant-design/icons';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, Row, Col, Form, Input, Button, Modal, message, Card } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ITEM_CONTRACT_ADDRESS } from "../utils";
import { ethers } from "ethers";
import Item from "./artifacts/contracts/Item.sol/Item.json";

const { TextArea } = Input;
const { Meta } = Card;

const items = [
    {
        label: 'Browse items',
        key: 'browseItems',
        icon: <UserOutlined />,
    },
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
  const [isModalVisible2, setIsModalVisible2] = useState(false);
  const [signer, setSigner] = useState(null);
  const [form] = Form.useForm();
  const [userAddress, setUserAddress] = useState("");
  const [userItems, setUserItems] = useState();
  const [globalItems, setGlobalItems] = useState();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
    image: ""
  });

  // Request access to User's MetaMask account
  const requestAccount = async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  };

  useEffect(() => {
    const checkWalletConnection = async () => {
      if (typeof window.ethereum !== "undefined") {
        const provider = new ethers.providers.Web3Provider(window.ethereum);

        try {
          await provider.send("eth_requestAccounts", []);

          const signer = provider.getSigner();
          setSigner(signer);

          const address = await signer.getAddress();
          setUserAddress(address);

          const itemContract = new ethers.Contract(ITEM_CONTRACT_ADDRESS, Item.abi, signer);
          setContract(itemContract);
        } catch (error) {
          console.log('Error checking wallet connection:', error);
          navigate("/");
        }
      } else {
        message.error('Please install MetaMask!');
      }
    };
    checkWalletConnection();

  }, []);

  const handleFinish = async (values) => {
    if (!contract) {
      message.error('Wallet not connected');
      return;
    }

    const { title, description, price, image } = values;
    if (typeof window.ethereum !== "undefined") {
      try {
        await requestAccount();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const itemContract = new ethers.Contract(
          ITEM_CONTRACT_ADDRESS,
          Item.abi,
          signer
        );

        const transaction = await itemContract.addItem(title, description, ethers.utils.parseUnits(price.toString(), 'ether'), image);
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

  const handleModalOpen2 = (item) => {
    setIsModalVisible2(true);
    setFormData({
        title: item.title,
        description: item.description,
        image: item.image,
        price: item.price
    })
  }

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleModalCancel2 = () => {
    setIsModalVisible2(false);
  }

  const retrieveUsersItems = async () => {
    if (contract) {
      try {
        const items = await contract.retrieveUserItems();
        setUserItems(items);
    } catch (error) {
        console.error('Error retrieving items:', error);
      }
    }
  };

  const browseAllItems = async () => {
    if (contract) {
      try {
        const items = await contract.browseItems();
        setGlobalItems(items);
      } catch (error) {
        console.error('Error retrieving items:', error);
      }
    }
  };
  

  const onClick = async (e) => {
    setCurrent(e.key);
    if (e.key === 'myItems') {
      await retrieveUsersItems();
    } else if (e.key == 'browseItems') {
      await browseAllItems();
    }
  };

  const editItem = () => {
    setIsModalVisible2(true);
  }

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
            </Col>
        </Row>
    {current === 'myItems' ?
    <>
      <Row>
        <Col>
            <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            style={{ margin: '16px' }} 
            onClick={handleModalOpen}
            >
            Add Item
            </Button>
        </Col>
        {userItems && userItems.map(item => {
            const bigNumberValue = ethers.BigNumber.from(item.price);
            const formattedValue = ethers.utils.formatEther(bigNumberValue);
            const randomNumber = Math.random().toString(36).substring(2, 9);

            return (
                <Col span={8}>
                    <Card
                    key={randomNumber}
                    hoverable
                    style={{
                        width: 240,
                    }}
                    actions={[
                        <SettingOutlined key="setting" onClick={handleModalOpen2(item)} />,
                        <EditOutlined key="edit" />,
                        <EllipsisOutlined key="ellipsis" />,
                    ]}
                    cover={<img alt="example" src={item.image} />}
                    >
                        <Meta title={item.title} description={item.description} />
                        <Meta title={formattedValue + 'ETH'} description={item.description} />
                    </Card>
                </Col>
            );
        })}
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
            <Input placeholder="Item title" value={formData.title} />
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
    : null}
    {current === 'browseItems' ? 
        <>
            <Row>
                {globalItems && globalItems.map(item => {
                    const bigNumberValue = ethers.BigNumber.from(item.price);
                    const formattedValue = ethers.utils.formatEther(bigNumberValue);
                    const randomNumber = Math.random().toString(36).substring(2, 9);

                    return (
                        <Col span={8}>
                            <Card
                            key={randomNumber}
                            hoverable
                            style={{
                                width: 240,
                            }}
                            actions={[
                                <SettingOutlined key="setting" />,
                                <EditOutlined key="edit" />,
                                <EllipsisOutlined key="ellipsis" />,
                            ]}
                            cover={<img alt="example" src={item.image} />}
                            >
                                <Meta title={item.title} description={item.description} />
                                <Meta title={formattedValue + 'ETH'} description={item.description} />
                            </Card>
                        </Col>
                    );
                })}
            </Row>
        </>
    : null}
    </>
  );
};

export default App;

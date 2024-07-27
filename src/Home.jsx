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

const menuItems = [
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
  const [contract, setContract] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [userItems, setUserItems] = useState([]);
  const [globalItems, setGlobalItems] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image: "",
    itemId: "",
  });

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
    console.log(price, ethers.utils.parseUnits(price.toString(), 'ether'));

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
  };

  const handleEditModalFinish = async (values) => {
    if (!contract) {
        message.error('Wallet not connected');
        return;
    }

    const { title, description, price, image } = values;
    console.log(price);
    try {
        await requestAccount();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const itemContract = new ethers.Contract(
          ITEM_CONTRACT_ADDRESS,
          Item.abi,
          signer
        );
        const transaction = await itemContract.editItem(
            title,
            description,
            price,
            image
        );
        console.log("OK2")
    
        await transaction.wait();
        console.log("OK3")

        message.success('Item edited successfully');
        editForm.resetFields();
        setIsEditModalVisible(false);
        await retrieveUsersItems(); // Refresh items list
    } catch (error) {
        console.error('Error editing item:', error);
        message.error('Failed to edit item ' + error);
    }
  }

  const handleModalOpen = () => {
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleEditModalCancel = () => {
    console.log("CANCEL EDIT MODAL")
    setIsEditModalVisible(false);
    setFormData({
      title: "",
      description: "",
      image: "",
      itemId: "",
    });
  };

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
    } else if (e.key === 'browseItems') {
      await browseAllItems();
    }
  };

  const openEditModal = (item) => {
    console.log(item)
    setFormData({
        ...formData,
        title: item.title,
        description: item.description,
        image: item.image,
        itemId: item.itemId,
        price: item.price,
      });
    setIsEditModalVisible(true);
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
            items={menuItems} 
          />
        </Col>
      </Row>
      {current === 'myItems' &&
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
          {userItems.map((item, index) => (
            <Col span={8} key={index}>
              <Card
                hoverable
                style={{
                  width: 240,
                }}
                actions={[
                  <SettingOutlined key="setting" onClick={() => openEditModal(item)} />,
                  <EditOutlined key="edit" />,
                  <EllipsisOutlined key="ellipsis" />,
                ]}
                cover={<img alt="example" src={item.image} />}
              >
                <Meta title={item.title} description={item.description} />
                <Meta title={`${item.price} ETH`} />
              </Card>
            </Col>
          ))}
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

        <Modal
          title="Edit Item"
          open={isEditModalVisible}
          onCancel={handleEditModalCancel}
          footer={null}
        >
          <Form
            form={editForm}
            layout="vertical"
            initialValues={formData}
            onFinish={handleEditModalFinish}
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
                Save edited item
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </>
      }
      {current === 'browseItems' &&
        <>
          <Row>
            {globalItems.map((item, index) => (
              <Col span={8} key={index}>
                <Card
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
                  <Meta title={`${ethers.utils.formatEther(ethers.BigNumber.from(item.price))} ETH`} />
                </Card>
              </Col>
            ))}
          </Row>
        </>
      }
    </>
  );
}

export default App;

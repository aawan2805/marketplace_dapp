import React, { useState, useEffect } from 'react';
import { UserOutlined, ShoppingCartOutlined, LogoutOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, Row, Col, Form, Input, Button, Modal, message, Card, Popconfirm } from 'antd';
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
    price: "",
    itemId: "",
  });
  const [isEditButtonLoading, setIsEditButtonLoading] = useState(false);
  const [isAddButtonLoading, setIsAddButtonLoading] = useState(false);
  const [deleteButtonLoading, setDeleteButtonLoading] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [isConfirmDeleteButtonLoading, setIsConfirmDeleteButtonLoading] = useState(false);

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
      await requestAccount();
    }

    const { title, description, price, image } = values;
    setIsAddButtonLoading(true);
    try {
      await requestAccount();
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const itemContract = new ethers.Contract(
        ITEM_CONTRACT_ADDRESS,
        Item.abi,
        signer
      );

      const transaction = await itemContract.addItem(title, description, Number(price), image);
      await transaction.wait();

      message.success('Item added successfully');
      form.resetFields();
      setIsModalVisible(false);    
    } catch (error) {
      console.error('Error adding item:', error);
      message.error('Failed to add item');       
    }
    setIsAddButtonLoading(false);
  };

  const handleEditModalFinish = async (values) => {
    if (!contract) {
        message.error('Wallet not connected');
        return;
    }
    setIsEditButtonLoading(true);
    const { title, description, price, image, itemId } = values;
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
            Number(itemId.toString()),
            title,
            description,
            Number(price.toString()),
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
    setIsEditButtonLoading(false);
  }

  const handleModalOpen = () => {
    setIsModalVisible(true);
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
  };

  const handleEditModalCancel = () => {
    setIsEditModalVisible(false);
    setFormData({
      title: "",
      description: "",
      image: "",
      itemId: "",
      price: "",
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
        itemId: Number(item.itemId.toString()),
        price: Number(item.price.toString()),
      });
    setIsEditModalVisible(true);
  };

  const confirmDeleteItemModal = async (values) => {
    if (!contract) {
        message.error('Wallet not connected');
        return;
    }
    const { itemId } = values;

    setOpenDeleteModal(true);
    setIsConfirmDeleteButtonLoading(true);
    try {
        await requestAccount();
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        const itemContract = new ethers.Contract(
          ITEM_CONTRACT_ADDRESS,
          Item.abi,
          signer
        );
        const transaction = await itemContract.deleteItem(
            Number(itemId.toString())
        );
    
        await transaction.wait();
        message.success('Item deleted.');
        setOpenDeleteModal(false);
        await retrieveUsersItems(); // Refresh items list
      } catch (error) {
        if(error.code === 'ACTION_REJECTED') {
          message.error('Action rejected by user')
        } else {
          message.error('Failed to delete item ' + error);
        }
        setOpenDeleteModal(false);
    }
    setIsConfirmDeleteButtonLoading(false);
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
              onClick={() => setIsModalVisible(true)}
            >
              Add Item
            </Button>
          </Col>
        </ Row>

        <Row>
          {userItems.map((item, index) => (
            <Col span={6} key={index}>
                  <Card
                    hoverable
                    style={{
                      width: 240,
                    }}
                    actions={[
                      <EditOutlined key="edit" onClick={() => openEditModal(item)} />,
                      <DeleteOutlined key="delete" style={{ color: '#eb2f96' }} onClick={() => setOpenDeleteModal(item)}  />,
                    ]}
                    cover={<img alt="example" src={item.image} />}
                  >
                    <Modal 
                    title="Delete" 
                    open={openDeleteModal} 
                    footer={[
                      <Button key="back" onClick={() => setOpenDeleteModal(false)}>
                        Cancel
                      </Button>,
                      <Button key="submit" type="primary" loading={isConfirmDeleteButtonLoading} onClick={() => confirmDeleteItemModal(item)}>
                        OK
                      </Button>,
                    ]}>
                    Are you sure you want to delete this item?
                    </Modal>

                    <Meta title={item.title} description={item.description} />
                    <Meta title={`${item.price.toString()} ETH`} />
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
              <Button type="primary" htmlType="submit" loading={isAddButtonLoading}>
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
            <Form.Item hidden={true} name="itemId" label="Item id">
              <Input hidden={true} placeholder="Item id" />
            </Form.Item>

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
              <Button type="primary" htmlType="submit" loading={isEditButtonLoading}>
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
                  <Meta title={`${item.price.toString()} ETH`} />
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

import React, { useState, useEffect } from 'react';
import { UserOutlined, ShoppingCartOutlined, LogoutOutlined, PlusOutlined, CloseOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, Row, Col, Form, Input, Button, Modal, message, Card, Tooltip, Tag, Upload } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ITEM_CONTRACT_ADDRESS } from "../utils";
import { API_URL } from '../utils';
import { ethers } from "ethers";
import Item from "./artifacts/contracts/Item.sol/Item.json";
import Escrow from "./artifacts/contracts/Escrow.sol/Escrow.json"
import axios from 'axios'

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
  const [account, setAccount] = useState(null);
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
  const [isPurchaseButtonDisabled, setIsPurchaseButtonDisabled] = useState(false);
  const [myPurchases, setMyPurchases] = useState([]);
  const [isLoadingConfirmDeliveryButton, setIsLoadingConfirmDeliveryButton] = useState(false)
  const [file, setFile] = useState("");
  const [imageName, setImageName] = useState()

  const requestAccount = async () => {
    await window.ethereum.request({ method: "eth_requestAccounts" });
  };

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
    }

    const formData = new FormData()
    formData.append("image", file)
    const result = await axios.post(`${API_URL}/images`, formData, { headers: {'Content-Type': 'multipart/form-data'}})
    setImageName(result.data.imageId)
    console.log("Image uploaded successfully")

    const { title, description, price, image } = values;
    setIsAddButtonLoading(true);
    try {
      await requestAccount();
      const transaction = await contract.addItem(title, description, Number(price), result.data.imageId);
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
    // setIsEditButtonLoading(true);
    const { title, description, price, image, itemId, imageUrl } = values;
    console.log(values)
    return;
    try {
        await requestAccount();

        // const formData = new FormData()
        // formData.append("image", file)
        // const result = await axios.post(`${API_URL}/images`, formData, { headers: {'Content-Type': 'multipart/form-data'}})
        // setImageName(result.data.imageId)
        // console.log("Image uploaded successfully")

        const transaction = await contract.editItem(
            Number(itemId.toString()),
            title,
            description,
            Number(price.toString()),
            image
        );
            await transaction.wait();

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
        setUserItems(updatedItems);
        console.log(updatedItems)
      } catch (error) {
        console.error('Error retrieving items:', error);
      }
    }
  };

  const browseAllItems = async () => {
    if (contract) {
      try {
        const items = await contract.browseItems();
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
        setGlobalItems(updatedItems);
      } catch (error) {
        console.error('Error retrieving items:', error);
      }
    }
  };

  const retrieveMyPurchases = async () => {
    try {
      const purchases = await contract.myPurchases();
      const purchasesWithStates = await Promise.all(purchases.map(async (purchase) => {
        const state = await fetchEscrowState(purchase.escrow);
        const buyAt = await fetchEscrowBoughtAt(purchase.escrow)
        return { ...purchase, escrowState: state, boughtAt: buyAt };
      }));
      setMyPurchases(purchasesWithStates);
      } catch (error) {
      console.error('Error fetching purchases:', error);
      message.error("Error fetching purchases " + error)
    }
  }

  const onClick = async (e) => {
    setCurrent(e.key);
    if (e.key === 'myItems') {
      await retrieveUsersItems();
    } else if (e.key === 'browseItems') {
      await browseAllItems();
    } else if (e.key === 'myPurchases') {
      await retrieveMyPurchases();
    }
  };

  const openEditModal = (item) => {
    console.log(item)
    setFormData({
        title: item.title,
        description: item.description,
        image: item.imageUrl,
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
        const transaction = await contract.deleteItem(
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

  const checkBalance = async (address) => {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const balance = await provider.getBalance(address);
    console.log(`Balance of ${address}: ${ethers.utils.formatEther(balance)}`);
  };
  
  const purchaseItem = async (item) => {
    if (!contract) {
      message.error('Wallet not connected');
      return;
    }
  
    setIsPurchaseButtonDisabled(true);
  
    const { itemId, price, seller } = item;
    const id = Number(itemId.toString());
    const valueInEther = ethers.utils.formatEther(price._hex); // Convert the price from BigNumber to a string in Ether
    const valueInWei = ethers.utils.parseEther(valueInEther); // Convert the price from Ether to Wei
  
    const userAddress = await contract.signer.getAddress();
    await checkBalance(userAddress); // Check balance before transaction
  
    console.log('Item ID:', id);
    console.log('Seller:', seller);
    console.log('Price in Ether:', valueInEther);
    console.log('Price in Wei:', valueInWei.toString());
  
    try {
      const transaction = await contract.purchaseItem(id, seller, {
        value: valueInWei, // Send the correct amount of Ether in Wei
        gasLimit: 5000000 // Set an appropriate gas limit
      });
      await transaction.wait();
  
      message.success('Purchase successful');
  
      await checkBalance(userAddress); // Check balance after transaction
    } catch (error) {
      console.error('Error purchasing item:', error);
      message.error('Error purchasing item');
    } finally {
      setIsPurchaseButtonDisabled(false);
    }
  };

  const fetchEscrowBoughtAt = async (escrowAddress) => {
    if (!escrowAddress || escrowAddress === ethers.constants.AddressZero) {
      return null;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, provider);
    try {
      const state = await escrowContract.boughtAt();
      return state;
    } catch (error) {
      console.error('Error fetching escrow state:', error);
      return null;
    }
  }

  const fetchEscrowState = async (escrowAddress) => {
    if (!escrowAddress || escrowAddress === ethers.constants.AddressZero) {
      return null;
    }
    const escrowAbi = [
      "function currState() view returns (uint8)"
    ];
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, provider);
    try {
      const state = await escrowContract.currState();
      return state;
    } catch (error) {
      console.error('Error fetching escrow state:', error);
      return null;
    }
  };

  const confirmDelivery = async (escrowAddress) => {
    if (!escrowAddress || escrowAddress === ethers.constants.AddressZero) {
      return null;
    }
    setIsLoadingConfirmDeliveryButton(true)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, signer);
    try {
      const transaction = await escrowContract.confirmDelivery();
      await transaction.wait();
      message.success("Item delivery confirmed successfully.")
    } catch (error) {
      console.error('Error fetching escrow state:', error);
      message.error('Error fetching escrow state:' + error)
    }
    setIsLoadingConfirmDeliveryButton(false)

  }

  const fetchImageUrl = async (imageId) => {
    try {
      const imageUrl = `http://localhost:8080/api/images/${imageId}`;
      const response = await axios.get(imageUrl, {
        responseType: 'blob', // This ensures that the response is treated as a binary file
      });
  
      // Instead of using URL.createObjectURL, just return the URL you constructed
      return imageUrl;
    } catch (error) {
      console.error('Error fetching image:', error);
      return null;
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
                    cover={<img alt="example" src={item.imageUrl} />}
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

            <label htmlFor="image">* Image</label>
            <input
              filename={file} 
              onChange={e => setFile(e.target.files[0])} 
              type="file" 
              accept="image/*"
              required
            />

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

            <Form.Item  name="currentImage" label="Current image" rules={[{ required: false, message: 'Please enter the image URL' }]}>
              <img src={formData.image} alt={formData.image} height={150} width={150} />
            </Form.Item>

            <label htmlFor="image">New image</label>
            <input
              filename={file} 
              onChange={e => setFile(e.target.files[0])} 
              type="file" 
              accept="image/*"
              name='image'
            />

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
                    <Button type="primary" loading={isPurchaseButtonDisabled} icon={<ShoppingCartOutlined />} onClick={() => purchaseItem(item)} />,
                  ]}
                  cover={<img alt="example" src={item.imageUrl} />}
                >
                  <Meta title={item.title} description={item.description} />
                  <Meta title={`${item.price.toString()} ETH`} />
                </Card>
              </Col>
            ))}
          </Row>
        </>
      }
      {current === 'myPurchases' && 
        <>
          <Row>
            {myPurchases.length === 0 && <p>No purchases found.</p>}
            {myPurchases.length > 0 && myPurchases.map((item, index) => (
              <Col span={8} key={index}>
                <Card
                  hoverable
                  style={{
                    width: 240,
                  }}
                  actions={[
                    item.escrowState === 0 ? (
                      <>
                        <Row>
                          <Col>
                            <Button loading={isLoadingConfirmDeliveryButton} type="primary" icon={<CheckOutlined />} onClick={() => confirmDelivery(item.escrow)}> 
                              Confirm item delivery 
                            </Button>
                          </Col>
                        </Row>
                        <Row>
                          <Col>
                            <Button loading={isLoadingConfirmDeliveryButton} danger icon={<CloseOutlined />} onClick={() => confirmDelivery(item.escrow)}> 
                              Cancel order's item 
                            </Button>
                          </Col>
                        </Row>
                      </>
                    ) : (null),
                    item.escrowState === 1 ? (<Tooltip title={"Item recieved"}><CheckOutlined /></Tooltip>) : (null),
                    item.escrowState === 2 ? (null) : (null)
                  ]}
                  cover={<img alt="example" src={item.image} />}
                >
                  <Meta title={item.title} description={item.description} />
                  <Meta title={`${item.price.toString()} ETH`} />
                  <Meta title={<Tag color='#87d068'>{new Date(item.boughtAt.toNumber() * 1000).toString().split("GMT")[0]}</Tag>} />

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

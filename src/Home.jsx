import React, { useState, useEffect } from 'react';
import { UserOutlined, ShoppingCartOutlined, LogoutOutlined, UploadOutlined, PlusOutlined, CloseOutlined, DeleteOutlined, CheckOutlined, ClockCircleOutlined, HistoryOutlined } from '@ant-design/icons';
import { EditOutlined, EllipsisOutlined, SettingOutlined } from '@ant-design/icons';
import { Menu, Row, Col, Form, Input, Button, Modal, message, Upload, Card, Tooltip, Tag, Drawer, Popconfirm } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ITEM_CONTRACT_ADDRESS, ARBITRATOR_ADDRESS, API_URL } from "../utils";
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
      label: 'My Sales',
      key: 'mySales',
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
  const [mySales, setMySales] = useState([]);
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
  const [BuyerproofFile, setBuyerProofFile] = useState("");
  const [sellerProofFile, setSellerProofFile] = useState("");
  const [imageName, setImageName] = useState()
  const [inputTrackingNumber, setInputTrackingNumber] = useState("");
  const [openHistoryModal, setOpenHistoryModal] = useState(false);
  const [item, setItem] = useState([]);

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

          const userAddress = await signer.getAddress();
          if(userAddress === ARBITRATOR_ADDRESS){
            navigate("/arbitrator");
          }

        } catch (error) {
          console.log('Error checking wallet connection:', error);
          navigate("/");
        }
      } else {
        message.error('Please install MetaMask!');
      }
    };
    const userAddress = async () => {

    }

    checkWalletConnection();
    userAddress();

  }, []);

  const handleError = (error) => {
    if(error.code === 'ACTION_REJECTED') {
      message.error('Action rejected by user')
    } else {
      console.log('Failed to delete item ' + error);
      message.error(error.error.data.message);  
    }
  }

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
      handleError(error);
    }
    setIsAddButtonLoading(false);
  };

  const handleEditModalFinish = async (values) => {
    console.log(values)
    if (!contract) {
        message.error('Wallet not connected');
        return;
    }
    // setIsEditButtonLoading(true);
    const { title, description, price, itemId } = values;

    try {
        await requestAccount();

        const formData = new FormData()
        formData.append("image", file)
        const result = await axios.post(`${API_URL}/images`, formData, { headers: {'Content-Type': 'multipart/form-data'}})
        // setImageName(result.data.imageId)
        // console.log("Image uploaded successfully")

        const transaction = await contract.editItem(
            Number(itemId.toString()),
            title,
            description,
            Number(price.toString()),
            result.data.imageId
        );
        await transaction.wait();

        message.success('Item edited successfully');
        editForm.resetFields();
        setIsEditModalVisible(false);
        await retrieveUsersItems(); // Refresh items list
    } catch (error) {
      handleError(error);
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
        handleError(error);
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
        const itemResponse = updatedItems.filter(item => item.itemId.toString() != 0);
        setGlobalItems(itemResponse);
      } catch (error) {
        handleError(error);
      }
    }
  };

  const showMySales = async () => {
    if (contract) {
      try {
        const items = await contract.mySales();
        const updatedItems = await Promise.all(
          items.map(async item => {
            try {
              const response = await axios.get(`http://localhost:8080/api/images/${item.image}`, {
                responseType: 'blob', // Ensure we treat the response as a binary file
              });
              const imageUrl = URL.createObjectURL(response.data);

              const estateStatus = await fetchMySaleEscorwState(item.escrow);
              const history = await getItemHistory(item);
              const buyAt = await fetchEscrowBoughtAt(item.escrow)
              let imageUrlSeller = null;
              let imageUrlBuyer = null;

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

              let data = {
                ...item,
                imageUrl, // Add the image URL as a new key
                estateStatus,
                history,
                boughtAt: buyAt,
                imageUrlSeller,  // Add imageUrlSeller to the data
                imageUrlBuyer,   // Add imageUrlBuyer to the data
              };
              return data;
              
            } catch (error) {
              handleError(error);
              return {
                ...item,
                imageUrl: null, // Handle the case where the image couldn't be fetched
                estateStatus: null,
                history,
                boughtAt: buyAt,
                imageUrlSeller: null,  // Add imageUrlSeller to the data
                imageUrlBuyer: null,   // Add imageUrlBuyer to the data
              };
            }
          })
        );
        console.log(updatedItems);
        setMySales(updatedItems);
      } catch (error) {
        handleError(error);
      }
    }
  };

  const fetchMySaleEscorwState = async (escrowAddress) => {
    if (!escrowAddress || escrowAddress === ethers.constants.AddressZero) {
      return null;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const escrowContract = new ethers.Contract(escrowAddress, Escrow.abi, provider);
    try {
      const state = await escrowContract.getState();
      return state;
    } catch (error) {
      console.error('Error fetching escrow state:', error);
      return null;
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
      const updatedPurchasesWithStates = await Promise.all(
        purchasesWithStates.map(async item => {
          console.log(item)
          try {
            const response = await axios.get(`http://localhost:8080/api/images/${item.image}`, {
              responseType: 'blob', // Ensure we treat the response as a binary file
            });

            const imageUrl = URL.createObjectURL(response.data);
            const estateStatus = await fetchMySaleEscorwState(item.escrow);
            const history = await getItemHistory(item);
            let imageUrlSeller = null;
            let imageUrlBuyer = null;

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

            console.log(estateStatus)
            // Add the new image URL key to the item
            return {
              ...item,
              imageUrl, // Add the image URL as a new key
              estateStatus,
              history,
              imageUrlSeller,  // Add imageUrlSeller to the data
              imageUrlBuyer,   // Add imageUrlBuyer to the data

            };
          } catch (error) {
            console.error(`Error fetching image for item ${item.id}:`, error);
            return {
              ...item,
              imageUrl: null, // Handle the case where the image couldn't be fetched
              estateStatus,
              history,
              imageUrlSeller: null,  // Add imageUrlSeller to the data
              imageUrlBuyer: null,   // Add imageUrlBuyer to the data

            };
          }
        })
      );
      setMyPurchases(updatedPurchasesWithStates);
    } catch (error) {
        handleError(error);
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
    } else if (e.key === 'mySales') {
      await showMySales();
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
        handleError(error);
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
      handleError(error);
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
      handleError(error);
    }
    setIsLoadingConfirmDeliveryButton(false)

  }

  const submitShip = async (item) => {
    const { escrow } = item;
    if (!escrow || escrow === ethers.constants.AddressZero) {
      return null;
    }
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer);
    console.log(escrow, inputTrackingNumber)

    try {
      const transaction = await escrowContract.ship(inputTrackingNumber);
      await transaction.wait();
      message.success("Item tracking number updated successfully.")
    } catch (error) {
      handleError(error);
    }
    setInputTrackingNumber("");
  }

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
    console.log("IS", item)
    setItem(item);
    setOpenHistoryModal(true);
  }

  const cancelItem = async (item) => {
    console.log("CANCELING")
    if (!contract) {
      message.error('Wallet not connected');
      return;
    }
    const { seller, itemId } = item;

    try {
        await requestAccount();
        const transaction = await contract.cancelItem(Number(itemId.toString()), seller);
        await transaction.wait();

        message.success('Item canceled.');
    } catch (error) {
      message.error(error.error.data.message);
    }
  }

  const raiseDispute = async (item) => {
    const { escrow } = item;
    if (!escrow || escrow === ethers.constants.AddressZero) {
      message.error("Invalid escrow address");
      return;
    }
  
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer);
  
    try {
      const transaction = await escrowContract.openDispute();
      await transaction.wait();
      message.success("Dispute opened successfully.");
    } catch (error) {
      handleError(error);
    }
  };

  const resolveDispute = async (item, refundToBuyer) => {
    const { escrow } = item;
    if (!escrow || escrow === ethers.constants.AddressZero) {
      message.error("Invalid escrow address");
      return;
    }
  
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer);
  
    try {
      const transaction = await escrowContract.resolveDispute(refundToBuyer);
      await transaction.wait();
      message.success(`Dispute resolved: ${refundToBuyer ? "Refunded to Buyer" : "Paid to Seller"}`);
    } catch (error) {
      console.error("Error resolving dispute:", error);
      message.error(error.error?.data?.message || error.message);
    }
  };
  
  const props = {
    name: 'file',
    action: 'https://localhost:8080/api/images',
    headers: {
      authorization: 'authorization-text',
    },
    onChange(info) {
      if (info.file.status !== 'uploading') {
        console.log(info.file, info.fileList);
      }
      if (info.file.status === 'done') {
        message.success(`${info.file.name} file uploaded successfully`);
      } else if (info.file.status === 'error') {
        message.error(`${info.file.name} file upload failed.`);
      }
    },
  }

  const submitProof = async (item, isBuyer) => {
    console.log("OK")
    const { escrow } = item;
    if (!contract) {
      message.error('Wallet not connected');
    }
    if (!escrow || escrow === ethers.constants.AddressZero) {
      message.error("Invalid escrow address");
      return;
    }
  
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const escrowContract = new ethers.Contract(escrow, Escrow.abi, signer);
  
    try {
      const formData = new FormData()
      if(isBuyer) {
        formData.append("image", BuyerproofFile)
      } else {
        formData.append("image", sellerProofFile)
      }
      console.log(formData)
      const result = await axios.post(`${API_URL}/images`, formData, { headers: {'Content-Type': 'multipart/form-data'}})
      console.log("Image uploaded successfully")
  
      if(isBuyer) {
        const transaction = await escrowContract.submitBuyerProof(result.data.imageId);
        await transaction.wait();
      } else {
        const transaction = await escrowContract.submitSellerProof(result.data.imageId);
        await transaction.wait();
      }
      message.success("Proof submitted.");
    } catch (error) {
      handleError(error);
    }
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
            <Col span={12} key={index}>
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
                    <HistoryOutlined onClick={() => changeHistoryState(item)} />,
                    item.escrowState === 1 ? (
                      <>
                        <Row>
                          <Col>
                            <Button loading={isLoadingConfirmDeliveryButton} type="primary" icon={<CheckOutlined />} onClick={() => confirmDelivery(item.escrow)}> 
                              Confirm item delivery 
                            </Button>
                          </Col>
                        </Row>
                        <Row>
                          <Popconfirm
                            title="Open dispute"
                            description="Are you sure to open a new dispute for this item?"
                            onConfirm={() => raiseDispute(item)}
                            onCancel={() => message.error("Dispute not opened.")}
                            okText="Yes"
                            cancelText="No"
                          >
                            <Button>Open dispute</Button>
                          </Popconfirm>
                        </Row>
                      </>
                    ) : (null),
                    item.escrowState === 0 ? (
                      <>
                        <Tooltip title={"Waiting delivery."}>
                          <ClockCircleOutlined />
                        </Tooltip>
                      </>
                    ) : (null),
                    item.escrowState === 0 ? (
                      <Tooltip title={"Cancel item."}>
                        <CloseOutlined onClick={() => cancelItem(item)} />
                      </Tooltip>
                    ) : (null),
                  ]}
                  cover={<img alt="example" src={item.imageUrl} />}
                >
                  <Meta title={item.title} description={item.description} />
                  <Meta title={`${item.price.toString()} ETH`} />
                  <Meta title={<Tag color='#87d068'>{new Date(item.boughtAt.toNumber() * 1000).toString().split("GMT")[0]}</Tag>} /> 
                  {item.estateStatus[0] !== 0 && 
                    <Meta title={<Tag color='red'>{item.estateStatus[1]}</Tag>} /> 
                  }
                  {item.estateStatus[0] === 2 && 
                    <Meta title={<Tag color='green'>Delivered</Tag>} /> 
                  }
                  {item.estateStatus[0] === 3 && 
                    <Meta title={<Tag color='blue'>Dispute open</Tag>} /> 
                  }
                  {item.escrowState === 3 && item.history[2] === "" &&
                    <>
                      <br />
                      <p style={{color: "red"}}>* Please provide your proof.</p>
                      <input
                        filename={BuyerproofFile} 
                        onChange={e => setBuyerProofFile(e.target.files[0])} 
                        type="file" 
                        id="proofImg"
                        accept="image/*"
                        required
                      />
                      <Button onClick={() => submitProof(item, true)}>Submit proof</Button>
                    </>
                  }
                </Card>
              </Col>
            ))}
          </Row>
        </>
      }
      {current === 'mySales' &&
        <>
          <Row>
            {mySales.map((item, index) => (
              <>
                <Col span={8} key={index}>
                  <Card
                    hoverable
                    style={{
                      width: 240,
                    }}
                    cover={<img alt="example" src={item.imageUrl} />}
                    actions={[
                      <HistoryOutlined onClick={() => changeHistoryState(item)} />
                    ]}
                  >
                    <Meta title={item.title} description={item.description} />
                    <Meta title={`${item.price.toString()} ETH`} />
                    <Meta title={<Tag color='#87d068'>{new Date(item.boughtAt.toNumber() * 1000).toString().split("GMT")[0]}</Tag>} /> 
                    {item.estateStatus[0] !== 0 && 
                      <Meta title={<Tag color='red'>{item.estateStatus[1]}</Tag>} /> 
                    }
                    {item.estateStatus[0] === 2 && 
                      <Meta title={<Tag color='green'>Delivered</Tag>} /> 
                    }
                    {item.estateStatus[0] === 3 && 
                      <Meta title={<Tag color='blue'>Dispute open</Tag>} /> 
                    }
                    {item.estateStatus[0] === 0 && (
                      <Card type="" title="">
                          <Row>
                            <Col>
                              <Input placeholder="Tracking number" size='' onChange={(e) => setInputTrackingNumber(e.target.value)}/>
                            </Col>
                          </Row>
                          <Row>
                            <Button onClick={() => submitShip(item)} title='Submit' type='primary'>Submit</Button>
                          </Row>
                        </Card>
                    )}
                    {item.estateStatus[0] === 3 && item.history[1] === "" &&
                      (<>
                        <br />
                        <p style={{color: "red"}}>* Please provide your proof of item shipping.</p>
                        <input
                          filename={sellerProofFile} 
                          onChange={e => setSellerProofFile(e.target.files[0])} 
                          type="file" 
                          id="proofSellerImg"
                          accept="image/*"
                          required
                        />
                        <Button onClick={() => submitProof(item, false)}>Submit proof</Button>
                      </>)
                      }
                  </Card>
                </Col>
              </>
            ))}
          </Row>
        </>
      }
    </>
  );
}

export default App;

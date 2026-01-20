import React, { useEffect, useState } from 'react';
import axios from 'axios';

// --- Helper Component: AI Chat Display ---
const AIResultDisplay = ({ data }) => {
  if (!data || !Array.isArray(data) || data.length === 0) {
    return <p style={{ color: '#888', fontStyle: 'italic' }}>No data table to display.</p>;
  }
  const firstItem = data[0];
  const keys = Object.keys(firstItem);

  if (data.length === 1 && keys.length === 1) {
    const value = firstItem[keys[0]];
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <h3 style={{ margin: 0, color: '#666', fontSize: '1rem' }}>{keys[0].replace(/_/g, ' ')}</h3>
        <p style={{ fontSize: '3rem', fontWeight: 'bold', color: '#007bff', margin: '10px 0' }}>
          {value}
        </p>
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
        <thead>
          <tr style={{ background: '#f4f4f4', textAlign: 'left' }}>
            {keys.map((k) => (
              <th key={k} style={{ padding: '10px', borderBottom: '2px solid #ddd' }}>
                {k.toUpperCase()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} style={{ borderBottom: '1px solid #eee' }}>
              {keys.map((k) => (
                <td key={k} style={{ padding: '10px' }}>{row[k]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

function App() {
  const [products, setProducts] = useState([]);
  
  // Chat State
  const [query, setQuery] = useState("");
  const [aiResponse, setAiResponse] = useState(null);
  const [loadingChat, setLoadingChat] = useState(false);

  // Form & Queue State
  const [newProduct, setNewProduct] = useState({ name: '', price: '', stock: '' });
  const [scannedQueue, setScannedQueue] = useState([]); // <--- THE QUEUE
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    axios.get('http://127.0.0.1:5000/products')
      .then(res => setProducts(res.data.products || res.data))
      .catch(err => console.error(err));
  };

  const handleAskAI = async () => {
    if (!query) return;
    setLoadingChat(true);
    setAiResponse(null);
    try {
      const res = await axios.post('http://127.0.0.1:5000/ask', { question: query });
      setAiResponse(res.data);
    } catch (error) {
      console.error("AI Error:", error);
      setAiResponse({ error: "Failed to get an answer." });
    }
    setLoadingChat(false);
  };

  // --- NEW: DELETE FUNCTION ---
const handleDeleteProduct = async (id) => {
  // 1. Optional: Confirm before deleting
  if (!window.confirm("Are you sure you want to delete this item?")) return;

  try {
    // 2. Call the API
    await axios.delete(`http://127.0.0.1:5000/products/${id}`);
    
    // 3. Update the UI *instantly* (Filter out the deleted item)
    // This is better than re-fetching the whole list!
    setProducts(products.filter(product => product.id !== id));
    
  } catch (error) {
    console.error("Delete Error:", error);
    alert("Failed to delete item.");
  }
};
const handleDeleteItem = async (id) => {
    // Confirm dialogue
    if (!window.confirm("Decrease stock (or delete if 1 left)?")) return;

    try {
      const res = await axios.delete(`http://127.0.0.1:5000/productStock/${id}`);
      
      console.log("Server Response:", res.data);

      if (res.data.message && res.data.message.includes("deleted")) {
        setProducts(products.filter(product => product.id !== id));
      } else {
        setProducts(products.map(product => {
          if (product.id === id) {
            return { ...product, stock: product.stock - 1 };
          }
          return product;
        }));
      }

    } catch (error) {
      console.error("Delete Error:", error);
      alert("Failed to update item.");
    }
  };
  // --- QUEUE LOGIC ---
  const loadNextItem = (currentQueue) => {
    if (currentQueue.length > 0) {
      // Take the first item from the queue
      const nextItem = currentQueue[0];
      setNewProduct({
        name: nextItem.name || '',
        price: nextItem.price || '',
        stock: nextItem.stock || ''
      });
      // Remove it from the queue for next time
      setScannedQueue(currentQueue.slice(1));
    } else {
      setNewProduct({ name: '', price: '', stock: '' });
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('http://127.0.0.1:5000/scan-invoice', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const items = res.data;
      
      if (items.length > 0) {
        alert(`Found ${items.length} items!`);
        const first = items[0];
        setNewProduct({ name: first.name, price: first.price, stock: first.stock });
        setScannedQueue(items.slice(1));
      } else {
        alert("OCR finished but found no items. Try a clearer image.");
      }
    } catch (error) {
      console.error("Scan Error:", error);
      alert("Could not read invoice.");
    }

    // --- THE FIX: RESET THE INPUT ---
    // This allows you to select the exact same file again if needed.
    e.target.value = null; 
    
    setUploading(false);
  };
  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      alert("Please fill in Name and Price");
      return;
    }
    try {
      // 1. Save to DB
      await axios.post('http://127.0.0.1:5000/products', newProduct);
      fetchProducts(); 
      
      // 2. Check Queue
      if (scannedQueue.length > 0) {
        // Load next item automatically
        const nextItem = scannedQueue[0];
        setNewProduct({
            name: nextItem.name || '',
            price: nextItem.price || '',
            stock: nextItem.stock || ''
        });
        setScannedQueue(prev => prev.slice(1)); // Remove the one we just loaded
      } else {
        // Queue empty
        setNewProduct({ name: '', price: '', stock: '' });
      }

    } catch (error) {
      console.error("Add Error:", error);
    }
  };

  const handleSkipItem = () => {
     if (scannedQueue.length > 0) {
        const nextItem = scannedQueue[0];
        setNewProduct({
            name: nextItem.name || '',
            price: nextItem.price || '',
            stock: nextItem.stock || ''
        });
        setScannedQueue(prev => prev.slice(1));
     } else {
        setNewProduct({ name: '', price: '', stock: '' });
     }
  };

  // --- STYLES ---
  const containerStyle = { padding: '40px', fontFamily: 'Segoe UI, sans-serif', background: '#f0f2f5', minHeight: '100vh' };
  const cardStyle = { background: 'white', padding: '25px', borderRadius: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', marginBottom: '20px' };
  const inputStyle = { padding: '10px', marginRight: '10px', borderRadius: '5px', border: '1px solid #ddd', marginBottom: '10px', width: '100%', boxSizing: 'border-box' };
  const buttonStyle = { padding: '10px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' };

  return (
    <div style={containerStyle}>
      <h1 style={{ color: '#333', textAlign: 'center', marginBottom: '40px' }}>BizMind Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        
        {/* LEFT COLUMN: Inventory & Entry */}
        <div>
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h2 style={{ margin: 0 }}>📝 Add Stock</h2>
              
              <label style={{ 
                  background: uploading ? '#ccc' : '#28a745', 
                  color: 'white', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' 
                }}>
                {uploading ? "Analyzing..." : "📷 Scan Invoice"}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} disabled={uploading} />
              </label>
            </div>

            {/* QUEUE INDICATOR */}
            {scannedQueue.length > 0 && (
                <div style={{ background: '#fff3cd', color: '#856404', padding: '10px', borderRadius: '5px', marginBottom: '15px', fontSize: '0.9rem' }}>
                    <strong>Queue:</strong> {scannedQueue.length} more items waiting...
                </div>
            )}

            <input style={inputStyle} placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="number" style={inputStyle} placeholder="Price" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} />
              <input type="number" style={inputStyle} placeholder="Stock" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: e.target.value})} />
            </div>
            
            <div style={{ display: 'flex', gap: '10px' }}>
                <button style={{ ...buttonStyle, width: '100%' }} onClick={handleAddProduct}>
                {scannedQueue.length > 0 ? "Add & Next" : "Add to Inventory"}
                </button>
                
                {scannedQueue.length > 0 && (
                    <button style={{ ...buttonStyle, background: '#6c757d', width: '30%' }} onClick={handleSkipItem}>
                        Skip
                    </button>
                )}
            </div>
          </div>

          <div style={cardStyle}>
            <h2 style={{ marginTop: 0 }}>📦 Live Inventory</h2>
            {products.length === 0 ? <p>No items yet.</p> : (
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {products.map(p => (
                  <li key={p.id} style={{padding: '10px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between',alignItems: 'center' // Ensures button aligns with text
                    }}>
                    
                    {/* Product Info */}
                    <span>
                      <strong>{p.name}</strong> (x{p.stock})
                    </span>
                    
                    {/* Right Side: Price + Delete Button */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <span style={{ color: '#28a745', fontWeight: 'bold' }}>${p.price}</span>
                      <button onClick={() => handleDeleteItem(p.id) } style={{
                          background: '#c56262',color: 'white',border: 'none',borderRadius: '4px',padding: '5px 10px',cursor: 'pointer',fontSize: '0.8rem'
                        }}>Minus</button>
                      <button 
                        onClick={() => handleDeleteProduct(p.id)}
                        style={{
                          background: '#ff4d4d',color: 'white',border: 'none',borderRadius: '4px',padding: '5px 10px',cursor: 'pointer',fontSize: '0.8rem'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </div>

                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: AI ANALYST */}
        <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>🧠 Ask Data Analyst</h2>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input style={inputStyle} placeholder="Ask a question..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskAI()} />
            <button style={buttonStyle} onClick={handleAskAI} disabled={loadingChat}>{loadingChat ? "..." : "Ask"}</button>
          </div>
          {aiResponse && (
            <div style={{ background: '#f8f9fa', padding: '15px', borderRadius: '8px', border: '1px solid #e9ecef' }}>
               {aiResponse.error && <p style={{ color: 'red' }}>{aiResponse.error}</p>}
               {aiResponse.human_text && <div style={{ padding: '10px', background: '#e3f2fd', borderRadius: '8px', marginBottom: '15px', color: '#0d47a1' }}><strong>🤖 AI: </strong> {aiResponse.human_text}</div>}
               <AIResultDisplay data={aiResponse.answer} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
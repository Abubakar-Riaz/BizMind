import React,{useState,useEffect} from "react";
import axios from 'axios';

function App(){
  const [products,setProduct]=useState([]);

  useEffect(()=>{
    axios.get('http://127.0.0.1:5000/products').then(response=>{
        console.log("API Response:", response.data);
        setProduct(response.data.products);
    }).catch(error=>console.error("Error fetching data:",error));
  },[]);


return (
<div style={{padding:'20px',fontFamily:'Arial'}}>
  <h1>BizMind Inventory</h1>
  
  {!products && products.length === 0 ? (
    <p>No products found. Use Postman to add some!</p>
  ) : (
    <ul>
      {products.map(p => (
        <li key={p.id} style={{margin:'10px 0', padding:'10px', background:'#f0f0f0'}}>
          {/* Ensure stock exists with a fallback */}
          <strong>{p.name}</strong> - ${p.price} (Stock: {p.stock || 0})
        </li>
      ))}
    </ul>
  )}
</div>
)
}

export default App;

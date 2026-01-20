import os
import json
import PIL.Image
from PIL import Image
from flask import Flask,jsonify,request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from dotenv import load_dotenv
import google.generativeai as genai
import pytesseract
import re

pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
load_dotenv()
API_KEY=os.getenv('GOOGLE_API_KEY')

genai.configure(api_key=API_KEY)

app=Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI']='sqlite:///bizmind.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS']=False

db=SQLAlchemy(app)

class Product(db.Model):
    id=db.Column(db.Integer,primary_key=True)
    name=db.Column(db.String(100),nullable=False)
    price=db.Column(db.Float,nullable=False)
    stock=db.Column(db.Integer,default=0)

def mock_ai_sql_generator(query):
    query=query.lower()

    if "how many" in query or "count" in query:
        return "SELECT sum(stock) as total_stock FROM product"
    elif "expensive" in query or "highest price" in query:
        return "SELECT name,price FROM product ORDER BY price DESC LIMIT 1"
    
    return "SELECT * FROM product"

def get_sql_from_gemini(query):
    prompt=f"""
            You are an expert SQL Data Analyst.
        I have a SQLite table named 'product'.
        Columns:
        - id (integer)
        - name (text)
        - price (float)
        - stock (integer)

        Task: Convert this English question into a SQL query.
        Question: "{query}"
        
        Rules:
        1. Return ONLY the raw SQL query. Do not use Markdown (no ```sql).
        2. Do not explain your answer.
        3. If the user asks for total value, use SUM(price * stock).
    """

    model=genai.GenerativeModel('gemini-3-flash-preview')
    response=model.generate_content(prompt)

    return response.text.replace('```sql', '').replace('```', '').strip()

def get_summary_from_gemini(query,generated_sql,result):
    
    if len(result)>0:
        summary_prompt = f"""
        User Question: "{query}"
        SQL Query Run: "{generated_sql}"
        Database Result: {result}

        Task: Answer the user's question naturally based on this data. 
        If it's a list, just say "Here is the list:" and summarize briefly.
        Keep it short and professional.
    """
        
        summary_model = genai.GenerativeModel('gemini-3-flash-preview')
        summary_response = summary_model.generate_content(summary_prompt)
        human_answer = str(summary_response.text)
    else:
        human_answer = "I found no data matching that request."

        # Step 5: Return BOTH the data (for tables) and the text (for chat)
    return human_answer

def analyze_image_with_gemini(image_file):
    img=PIL.Image.open(image_file)

    model=genai.GenerativeModel('gemini-3-flash-preview')

    prompt="""
    Analyze this image of a product label, invoice, or list.
    Extract the following product details into a valid JSON object:
    - name: The main product name (string)
    - price: The price per unit (number)
    - stock: The quantity or stock count (integer). Default to 1 if not found.

    Return ONLY raw JSON. No markdown formatting.
    """

    response=model.generate_content([prompt,img])

    clean_json=response.text.replace('```json','').replace('```','').strip()
    return clean_json

def read_text_with_ocr(image_path):

    if not os.path.exists(image_path):
        print("Error: File not found.")
        return

    try:
        # 2. Open Image
        img = Image.open(image_path)
        
        custom_config = r'--oem 3 --psm 6' 
        text = pytesseract.image_to_string(img, config=custom_config)
        
        return text
    
    except Exception as e:
        print(f"Error: {e}")
        return 404
def parse_invoice_text(raw_text):

    products=[]
    lines=raw_text.split('\n')

    pattern=r'(.*?)\s+(?:Rs|rs|RS)[^\d]*(\d+)\D*(\d+)'

    header_found=False

    for i,line in enumerate(lines[:10]):
        line_lower=line.lower()

        if "item" in line_lower or ("rate" in line_lower or "qty" in line_lower or "quantity" in line_lower):
            print(f"DEBUG: Found header row: {line}")
            
            idx_qty=line_lower.find("qty")
            if idx_qty==-1:idx_qty=line_lower.find("quantity")

            idx_rate=line_lower.find("rate")
            if idx_rate==-1:idx_rate=line_lower.find("price")

            if idx_qty>-1 and idx_rate>-1:
                if idx_qty < idx_rate:
                    # Case: Quantity comes BEFORE Rate
                    # Header: "Item | Qty | Rate"
                    # Regex: Name ... Qty ... Price
                    print("DEBUG: Detected 'Qty' before 'Price'")
                    pattern = r'(.*?)\s+(\d+)\s+(?:Rs|rs|RS)[^\d]*(\d+)'
                    # Note: In this pattern, Group 2 is Qty, Group 3 is Price. We must swap them later.
                    header_found = "QTY_FIRST"
                else:
                    print("DEBUG: Detected 'Price' before 'Qty' (Standard)")
                    header_found = "PRICE_FIRST"
            break
    ignore_words=["total","subtotal","tax","gst","receipt","date","thank"]

    for line in lines:
        line_clean=line.strip()

        if not line_clean:continue

        if any(w in line_clean.lower() for w in ignore_words):
            continue
        if "item" in line_clean.lower() and "rate" in line_clean.lower():
            continue

        match=re.search(pattern,line_clean)

        if match:
            # Extraction depends on which pattern we used
            if header_found == "QTY_FIRST":
                # Pattern was: Name ... Qty ... Price
                name_raw = match.group(1).strip()
                qty_raw = match.group(2)
                price_raw = match.group(3)
            else:
                # Pattern was: Name ... Price ... Qty (Standard)
                name_raw = match.group(1).strip()
                price_raw = match.group(2)
                qty_raw = match.group(3)

            # Cleanup
            if len(name_raw) > 2:
                try:
                    products.append({
                        "name": name_raw.rstrip('-., '),
                        "price": float(price_raw),
                        "stock": int(qty_raw)
                    })
                except ValueError:
                    continue

    return products


@app.route('/products',methods=['GET'])
def get_products():
    products=Product.query.all()

    output=[]
    for product in products:
        product_data={'id':product.id, 'name':product.name, 'price':product.price, 'stock':product.stock}
        output.append(product_data)
    return jsonify({"products":output})

@app.route('/products',methods=['POST'])
def add_product():
    data=request.get_json()

    item_name=data['name']

    existing_product=Product.query.filter(Product.name.ilike(item_name)).first()
    
    if existing_product:
        existing_product.stock+=int(data['stock'])

        db.session.commit()
        return jsonify({"message":"Updated stock"})
    else:

        new_product=Product(name=data['name'],price=data['price'],stock=data.get('stock',0))
        db.session.add(new_product)
        db.session.commit()
        return jsonify({'message':'Product Created Successfully'})

@app.route('/productStock/<int:id>',methods=['DELETE'])
def delete_item(id):
    product=db.get_or_404(Product,id)
    try:
        if product.stock>1:
            product.stock-=1
            db.session.commit()
            print("Stock updated successfully")
            return jsonify({"message":"updated successfully"}),200
        else:
            db.session.delete(product)
            db.session.commit()
            print("Product deleted successfully")
            return jsonify({"message":"deleted successfully"}),200
    except Exception as e:
        return jsonify({"Error":str(e)}),500

@app.route('/products/<int:id>',methods=['DELETE'])
def delete_product(id):
    product=db.get_or_404(Product,id)
    try:
        db.session.delete(product)
        db.session.commit()
        print("Product deleted successfully")
        return jsonify({"message":"deleted successfully"}),200
    except Exception as e:
        return jsonify({"Error":str(e)}),500
    
@app.route('/ask',methods=['POST'])
def ask_database():
    query=request.json.get('question')
    generated_Sql=get_sql_from_gemini(query)

    try:
        result=db.session.execute(text(generated_Sql))

        data=[dict(row._mapping) for row in result]

        finalResponse=get_summary_from_gemini(query,generated_Sql,data)
        return jsonify({"answer":finalResponse,"generated sql":generated_Sql})
    except Exception as e:
        return jsonify({"error":str(e)})
    
@app.route('/scan-invoice',methods=['POST'])
def scan_invoice():
    if 'file' not in request.files:
        return jsonify({"error":"No file uploaded"}),400
    
    file=request.files['file']

    try:
        #json_str=analyze_image_with_gemini(file)
        img=PIL.Image.open(file)

        custom_config = r'--oem 3 --psm 6'
        ocr_txt = pytesseract.image_to_string(img, config=custom_config)
        #ocr_txt=read_text_with_ocr('testimg.png')
        data=parse_invoice_text(ocr_txt)
        #data=json.loads(json_str)

        if not isinstance(data,list):
            data=[data]
        return jsonify(data)
        #     if(len(data)>0):
        #         data=data[0]
        #     else:
        #         return jsonify({"error":"No product found in list"}),400
        # return jsonify(data)
    
    except Exception as e:
        print(f"Vision Error:{e}")
        return jsonify({"error":"Could not read image"}),500
    
if __name__=='__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True,port=5000)

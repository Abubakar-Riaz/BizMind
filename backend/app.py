from flask import Flask,jsonify,request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy

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

    new_product=Product(name=data['name'],price=data['price'],stock=data.get('stock',0))
    db.session.add(new_product)
    db.session.commit()
    return jsonify({'message':'Product Created Successfully'})

if __name__=='__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True,port=5000)

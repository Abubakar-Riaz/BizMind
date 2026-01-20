import pytesseract
from PIL import Image
import os

# 1. SETUP: Point to the Tesseract Engine (Use your specific path)
# If you installed it elsewhere, update this string!
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

def test_image(image_path):
    print(f"--- Testing Image: {image_path} ---")
    
    # Check if file exists first
    if not os.path.exists(image_path):
        print("❌ Error: File not found. Check the name!")
        return

    try:
        # 2. Open Image
        img = Image.open(image_path)
        
        # 3. RUN OCR (The Magic)
        # custom_config helps Tesseract assume it's a block of text
        custom_config = r'--oem 3 --psm 6' 
        text = pytesseract.image_to_string(img, config=custom_config)
        
        # 4. Print Result
        print("\n👇 RAW TESSERACT OUTPUT 👇")
        print("="*30)
        print(text)
        print("="*30)
        
    except Exception as e:
        print(f"❌ Error: {e}")

# --- RUN THE TEST ---
# Replace 'test_invoice.png' with the actual name of an image you have in this folder
# You can copy an image into the backend folder just to test it.
test_image("testimg.png")
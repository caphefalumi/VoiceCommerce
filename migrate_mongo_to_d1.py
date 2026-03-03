import pymongo
import json
import os
from datetime import datetime

MONGODB_URI = os.environ.get("MONGODB_URI", "mongodb://localhost:27017/")

client = pymongo.MongoClient(MONGODB_URI)
db = client["tgdd"]


def escape_sql(s):
    if s is None:
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def escape_sql_str(s):
    if s is None or s == "":
        return "NULL"
    return "'" + str(s).replace("'", "''") + "'"


def to_sql_number(n, default=0):
    if n is None:
        return str(default)
    return str(n)


def convert_for_json(obj):
    """Convert MongoDB objects to JSON-serializable types"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {k: convert_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_for_json(item) for item in obj]
    elif isinstance(obj, (str, int, float, bool, type(None))):
        return obj
    else:
        return str(obj)


def to_json_sql(json_obj):
    if json_obj is None:
        return "NULL"
    return "'" + json.dumps(convert_for_json(json_obj)).replace("'", "''") + "'"


print("Exporting products...")
products = list(db["products"].find())
print(f"Found {len(products)} products")

print("Exporting users...")
users = list(db["users"].find())
print(f"Found {len(users)} users")

print("Exporting cell phone models...")
cell_phones = list(db["Dataset_Cell_Phones_Model_Brand"].find({}, {"_id": 0, "ACL": 0}))
print(f"Found {len(cell_phones)} cell phone models")

with open("drizzle/002_migrate_data.sql", "w", encoding="utf-8") as f:
    f.write("-- Data migration from MongoDB to D1\n")
    f.write("-- Run this after 001_initial_schema.sql\n\n")

    for p in products:
        p_id = p.get("_id", p.get("id", ""))
        p_id = escape_sql_str(p_id)
        url = escape_sql_str(p.get("url"))
        name = escape_sql_str(p.get("name"))
        price = to_sql_number(p.get("price"), 0)
        original_price = to_sql_number(p.get("originalPrice"))
        category = escape_sql_str(p.get("category"))
        brand = escape_sql_str(p.get("brand"))
        rating = to_sql_number(p.get("rating"), 0)
        review_count = to_sql_number(p.get("reviewCount"), 0)
        stock = to_sql_number(p.get("stock"), 0)
        description = escape_sql_str(p.get("description"))
        images = to_json_sql(p.get("images", []))
        specs = to_json_sql(p.get("specs", []))
        reviews = to_json_sql(p.get("reviews", []))
        embedding = to_json_sql(p.get("embedding"))

        f.write(
            f"INSERT INTO products (id, url, name, price, original_price, category, brand, rating, review_count, stock, description, images, specs, reviews, embedding) VALUES ({p_id}, {url}, {name}, {price}, {original_price}, {category}, {brand}, {rating}, {review_count}, {stock}, {description}, {images}, {specs}, {reviews}, {embedding});\n"
        )

    for u in users:
        u_id = escape_sql_str(u.get("_id", u.get("id", "")))
        username = escape_sql_str(u.get("username"))
        email = escape_sql_str(u.get("email"))
        password = escape_sql_str(u.get("password"))
        email_verified = 1 if u.get("emailVerified") else 0
        auth_data = to_json_sql(u.get("authData"))

        f.write(
            f"INSERT INTO users (id, username, email, password, email_verified, auth_data) VALUES ({u_id}, {username}, {email}, {password}, {email_verified}, {auth_data});\n"
        )

    for c in cell_phones:
        c_id = c.get("id", c.get("_id", ""))
        model = escape_sql_str(c.get("Model"))
        brand = escape_sql_str(c.get("Brand"))
        network = escape_sql_str(c.get("Network"))
        announced = escape_sql_str(c.get("Announced"))
        status = escape_sql_str(c.get("Status"))
        dimensions = escape_sql_str(c.get("Dimensions"))
        weight = escape_sql_str(c.get("Weight"))
        sim = escape_sql_str(c.get("SIM"))
        display_type = escape_sql_str(c.get("Display_type"))
        display_size = escape_sql_str(c.get("Display_size"))
        display_resolution = escape_sql_str(c.get("Display_resolution"))
        os = escape_sql_str(c.get("Operating_System"))
        cpu = escape_sql_str(c.get("CPU"))
        chipset = escape_sql_str(c.get("Chipset"))
        gpu = escape_sql_str(c.get("GPU"))
        memory_card = escape_sql_str(c.get("Memory_card"))
        internal_memory = escape_sql_str(c.get("Internal_memory"))
        ram = escape_sql_str(c.get("RAM"))
        primary_camera = escape_sql_str(c.get("Primary_camera"))
        secondary_camera = escape_sql_str(c.get("Secondary_camera"))
        bluetooth = escape_sql_str(c.get("Bluetooth"))
        gps = escape_sql_str(c.get("GPS"))
        nfc = escape_sql_str(c.get("NFC"))
        radio = escape_sql_str(c.get("Radio"))
        usb = escape_sql_str(c.get("USB"))
        sensors = escape_sql_str(c.get("Sensors"))
        battery = escape_sql_str(c.get("Battery"))
        colors = escape_sql_str(c.get("Colors"))
        price = to_sql_number(c.get("price"))
        images = to_json_sql(c.get("images", []))
        embedding = to_json_sql(c.get("embedding"))

        f.write(
            f"""INSERT INTO cell_phone_models (id, model, brand, network, announced, status, dimensions, weight, sim, display_type, display_size, display_resolution, os, cpu, chipset, gpu, memory_card, internal_memory, ram, primary_camera, secondary_camera, bluetooth, gps, nfc, radio, usb, sensors, battery, colors, price, images, embedding) VALUES ({c_id}, {model}, {brand}, {network}, {announced}, {status}, {dimensions}, {weight}, {sim}, {display_type}, {display_size}, {display_resolution}, {os}, {cpu}, {chipset}, {gpu}, {memory_card}, {internal_memory}, {ram}, {primary_camera}, {secondary_camera}, {bluetooth}, {gps}, {nfc}, {radio}, {usb}, {sensors}, {battery}, {colors}, {price}, {images}, {embedding});\n"""
        )

print("Generated drizzle/002_migrate_data.sql")
print(f"Migration ready for:")
print(f"  - {len(products)} products")
print(f"  - {len(users)} users")
print(f"  - {len(cell_phones)} cell phone models")

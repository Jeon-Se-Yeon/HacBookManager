import json
import os
import uuid

def generate_initial_json():
    with open('parsed_book_list.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    books_list = []
    
    # Counter for fallback unique IDs
    counter = 1

    for sheet, sheet_data in data.items():
        cols = sheet_data['columns']
        rows = sheet_data['rows']
        
        # Check if the columns contain a valid book (when no headers are present in the sheet)
        if cols and len(cols) >= 2:
            col1 = str(cols[0]).strip()
            col2 = str(cols[1]).strip()
            if 'Unnamed' not in col1 and col1 not in ['제목', '도서명', '책제목', '분류', '구분', '책 이름', '분류 ']:
                extra = ''
                if len(cols) > 2 and 'Unnamed' not in str(cols[2]):
                    extra = str(cols[2]).strip()
                
                books_list.append({
                    "id": f"book-{counter}",
                    "title": col1,
                    "category": sheet,
                    "volumes": col2,
                    "notes": extra,
                    "readStatus": "unread"
                })
                counter += 1
                
        # Parse standard rows
        for row in rows:
            if not row or len(row) == 0:
                continue
            title = str(row[0]).strip()
            if not title:
                continue
                
            volumes = str(row[1]).strip() if len(row) > 1 else ''
            notes = str(row[2]).strip() if len(row) > 2 else ''
            
            books_list.append({
                "id": f"book-{counter}",
                "title": title,
                "category": sheet,
                "volumes": volumes,
                "notes": notes,
                "readStatus": "unread"
            })
            counter += 1

    # Ensure target directory exists
    os.makedirs(os.path.join('src', 'data'), exist_ok=True)
    
    with open(os.path.join('src', 'data', 'initialData.json'), 'w', encoding='utf-8') as f:
        json.dump(books_list, f, ensure_ascii=False, indent=2)

    print(f"Successfully structured {len(books_list)} books and saved to src/data/initialData.json")

if __name__ == '__main__':
    generate_initial_json()

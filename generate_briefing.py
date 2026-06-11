import json

def generate_report():
    with open('parsed_book_list.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    md = []
    md.append('# HAC Book List Briefing')
    md.append('')
    md.append('This report provides a comprehensive summary of the comic book inventory listed in `HAC_Book_List.xlsx`. The inventory is organized across multiple sheets, primarily based on the initial Korean consonant of the book titles (ㄱ to ㅎ), followed by specialized sections.')
    md.append('')

    # Calculate summary stats
    sheet_summaries = []
    total_entries = 0

    for sheet, sheet_data in data.items():
        cols = sheet_data['columns']
        rows = sheet_data['rows']
        
        # Standardize entries: check if columns represent a book
        books = []
        
        # If the first column is not an 'Unnamed' column and doesn't look like a standard header, treat it as a book
        if cols and len(cols) >= 2:
            col1 = str(cols[0]).strip()
            col2 = str(cols[1]).strip()
            # If it's a book title (doesn't contain header words and isn't Unnamed)
            if 'Unnamed' not in col1 and col1 not in ['제목', '도서명', '책제목', '분류', '구분', '책 이름', '분류 ']:
                is_col_book = True
                extra = ''
                if len(cols) > 2 and 'Unnamed' not in str(cols[2]):
                    extra = str(cols[2]).strip()
                books.append({'title': col1, 'volumes': col2, 'notes': extra})
                
        for row in rows:
            if not row or len(row) == 0:
                continue
            title = str(row[0]).strip()
            if not title:
                continue
                
            volumes = str(row[1]).strip() if len(row) > 1 else ''
            notes = str(row[2]).strip() if len(row) > 2 else ''
            books.append({'title': title, 'volumes': volumes, 'notes': notes})
            
        total_entries += len(books)
        sheet_summaries.append({
            'sheet': sheet,
            'count': len(books),
            'books': books
        })

    md.append('## Executive Summary')
    md.append('')
    md.append(f'- **Total Sheets**: {len(data)}')
    md.append(f'- **Total Unique Comic Books/Novels**: {total_entries}')
    md.append('')
    md.append('### Sheet Inventory Summary')
    md.append('')
    md.append('| Sheet Name | Book Count | Character Range / Description |')
    md.append('| :--- | :--- | :--- |')

    # Map sheet names to friendly descriptions
    descriptions = {
        'ㄱ': 'Books starting with ㄱ (e.g., 기생수, 귀멸의 칼날, 강철의 연금술사)',
        'ㄴ': 'Books starting with ㄴ (e.g., 나나, 나츠메 우인장, 나의 히어로 아카데미아)',
        'ㄷ': 'Books starting with ㄷ (e.g., 데스노트, 던전 밥, 동경 바빌론)',
        'ㄹ': 'Books starting with ㄹ (e.g., 러프, 레이브, 라이어 게임)',
        'ㅁ': 'Books starting with ㅁ (e.g., 미스터 초밥왕, 명탐정 코난, 몬스터)',
        'ㅂ': 'Books starting with ㅂ (e.g., 바텐더, 바쿠만, 배가본드, 보노보노)',
        'ㅅ': 'Books starting with ㅅ (e.g., 슬램덩크, 소용돌이, 신세기 에반게리온)',
        'ㅇ': 'Books starting with ㅇ (e.g., 원피스, 열혈강호, 은혼, 요츠바랑!)',
        'ㅈ': 'Books starting with ㅈ (e.g., 진격의 거인, 지옥선생 누베, 전격 피카츄)',
        'ㅊ': 'Books starting with ㅊ (e.g., 총몽, 체리 신드롬, 천사금렵구)',
        'ㅋ': 'Books starting with ㅋ (e.g., 크로노 크루세이드, 카이지, 큐이디(Q.E.D.))',
        'ㅌ': 'Books starting with ㅌ (e.g., 터치, 트라이건, 투러브 트러블)',
        'ㅍ': 'Books starting with ㅍ (e.g., 피아노의 숲, 풀 메탈 패닉, 파라다이스 키스)',
        'ㅎ&ㄲ': 'Books starting with ㅎ & Double Consonants ㄲ, ㄸ, ㅃ, ㅆ, ㅉ (e.g., 하이큐!!, 헌터x헌터)',
        '판타지&소설': 'Light Novels and Fantasy Novels (e.g., 9S, 반쪽 달이 떠오르는 하늘)',
        '기타': 'Miscellaneous items / Expressions'
    }

    for s in sheet_summaries:
        sheet_name = s['sheet']
        count = s['count']
        desc = descriptions.get(sheet_name, 'Special / Miscellaneous Books')
        md.append(f'| {sheet_name} | {count} | {desc} |')

    md.append('')
    md.append('---')
    md.append('')
    md.append('## Detailed Book Inventory by Sheet')
    md.append('')

    for s in sheet_summaries:
        sheet_name = s['sheet']
        count = s['count']
        md.append(f'### Sheet: {sheet_name} ({count} books)')
        md.append('')
        if count == 0:
            md.append('*No books found in this sheet.*')
            md.append('')
            continue
            
        md.append('| Book Title (도서명) | Volumes Held (소장 권수) | Notes / Details (비고) |')
        md.append('| :--- | :--- | :--- |')
        for b in s['books']:
            title_esc = b['title'].replace('|', '\\|')
            vols_esc = str(b['volumes']).replace('|', '\\|')
            notes_esc = b['notes'].replace('|', '\\|')
            md.append(f'| {title_esc} | {vols_esc} | {notes_esc} |')
        md.append('')

    with open('HAC_Book_Briefing.md', 'w', encoding='utf-8') as f:
        f.write('\n'.join(md))

if __name__ == '__main__':
    generate_report()
    print("Briefing file generated at HAC_Book_Briefing.md")

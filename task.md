# Task: Automated Restaurant Creation Pipeline

- [ ] **Design & Analysis**
    - [ ] Define CSV/Excel Template Structure <!-- id: 0 -->
    - [ ] Define Media Folder Structure Convention <!-- id: 1 -->
    - [ ] Design "Ingestion Script" Architecture (Local Node.js vs Admin UI) <!-- id: 2 -->
- [ ] **Implementation: Backend (Worker)**
    - [ ] Create `POST /admin/import-restaurant` endpoint <!-- id: 3 -->
    - [ ] Implement bulk insertion logic (Sections, Dishes, Translations) <!-- id: 4 -->
    - [ ] Implement Media linking logic in backend <!-- id: 5 -->
- [ ] **Implementation: Tooling (Script)**
    - [ ] Create Node.js script for parsing CSV <!-- id: 6 -->
    - [ ] Integrate AI Translation (Mock or Real API) <!-- id: 7 -->
    - [ ] Implement Media Upload to R2 logic <!-- id: 8 -->
    - [ ] Connect Script to Backend API <!-- id: 9 -->
- [ ] **Verification**
    - [ ] Test with sample CSV and Media folder <!-- id: 10 -->
    - [ ] Verify Database Integrity after import <!-- id: 11 -->

- [ ] **Database Management**
    - [ ] Export Database <!-- id: 12 -->

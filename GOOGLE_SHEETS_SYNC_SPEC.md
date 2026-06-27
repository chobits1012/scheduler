# Google Sheets Sync Feature Specification

## Context
We are implementing a feature to sync local shift availability to a company Google Sheet.

## Spreadsheet Structure
- **URL**: Fixed URL (e.g., `https://docs.google.com/spreadsheets/d/1ms4h5iJwgIhW2et2jA3e9Xynm4mf3RrGA3kAbr5Fok4...`).
- **Tabs**: Monthly tabs (e.g., "1演員", "2演員"). User selects the target tab.
- **Header**: Dates are in the header rows (Row 1-2).
- **Columns**: Each day occupies **3 columns** (Time, Shift, Status).
- **Rows**: The user "王捷仟" is located in Column A.
- **User Block**: The user has **15 rows** allocated to them (e.g., Row 243-257).
- **Row Meaning**: The 15 rows correspond to **15 hourly slots** starting from **09:00 to 23:00**.

## Synchronization Logic
1. **Input**: User selects target "Month/Sheet Name" in the App.
2. **Process**:
   - Identify user's block of 15 rows in the sheet.
   - For each day, check the user's *local* availability.
   - **Logic Rule**:
     - If the user is **Available** (Working) at a specific hour (e.g., 10:00):
       - **Action**: Clear color (White) for that row's 3 columns.
     - If the user is **Unavailable** (Not Working) at a specific hour:
       - **Action**: Fill background with **GRAY** for that row's 3 columns.

## Tech Implementation Plan
- **Auth**: Update `firebase.ts` to request `https://www.googleapis.com/auth/spreadsheets`.
- **UI**: Create `SyncConfigModal` for URL and Sheet Name input.
- **Hook**: `useGoogleSheets` to handle the grid fetching, coordinate mapping, and batch updates.

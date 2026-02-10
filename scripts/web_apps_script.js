
function doGet(e) {
  const props = PropertiesService.getScriptProperties();
  const ssId = props.getProperty('SPREADSHEET_ID');
  
  if (!ssId) {
    return ContentService.createTextOutput(JSON.stringify({error: "SPREADSHEET_ID not set. Add it in Project Settings > Script Properties."}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  try {
    const ss = SpreadsheetApp.openById(ssId);
    const sheet = ss.getSheets()[0]; 
    const allData = sheet.getDataRange().getValues();
    
    if (allData.length <= 1) {
      return ContentService.createTextOutput(JSON.stringify({nodes: [], error: "Sheet is empty"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Normalize headers: lowercase and trim
    const rawHeaders = allData[0].map(h => String(h));
    const cleanHeaders = rawHeaders.map(h => h.toLowerCase().trim());
    const rows = allData.slice(1);

    // Dynamic Column Mapping
    const idx = (name) => cleanHeaders.indexOf(name.toLowerCase());

    const colMap = {
      id: idx("ID"),
      parentId: idx("ParentID"),
      label: idx("Label"),
      url: idx("URL"),
      description: idx("Description"),
      imageUrl: idx("ImageURL")
    };

    const result = rows.map((row) => {
      const getVal = (key) => {
        const i = colMap[key];
        if (i === undefined || i === -1) return "";
        return String(row[i] || "").trim();
      };

      return {
        id: getVal("id"),
        parentId: getVal("parentId") || null,
        label: getVal("label") || "Untitled",
        url: getVal("url"),
        description: getVal("description"),
        imageUrl: getVal("imageUrl")
      };
    }).filter(node => node.id && node.label);

    const response = {
      timestamp: new Date().toISOString(),
      detectedHeaders: rawHeaders,
      count: result.length,
      nodes: result
    };

    return ContentService.createTextOutput(JSON.stringify(response))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({error: err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

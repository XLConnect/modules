function detectDelimiter(csv) {
  const delimiters = [',', ';', '\t', '|'];
  const delimiterCounts = delimiters.map(delim => ({
    delim,
    count: (csv.split('\n')[0].match(new RegExp(`\\${delim}`, 'g')) || []).length
  }));
  return delimiterCounts.sort((a, b) => b.count - a.count)[0].delim;
}

function detectLineBreak(csv) {
  const lineBreaks = ['\r\n', '\n', '\r'];
  const lineBreakCounts = lineBreaks.map(lb => ({
    lb,
    count: (csv.match(new RegExp(lb, 'g')) || []).length
  }));
  return lineBreakCounts.sort((a, b) => b.count - a.count)[0].lb;
}

function splitLine(line, delimiter, escapeChar) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === escapeChar) {
      if (insideQuotes && line[i + 1] === escapeChar) {
        current += escapeChar;
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

function read(csv) {
  const delimiter = detectDelimiter(csv);
  const lineBreak = detectLineBreak(csv);
  const escapeChar = '"';

  const lines = csv.split(lineBreak);
  const headers = splitLine(lines[0], delimiter, escapeChar).map(header => header.trim().replace(/^"(.*)"$/, '$1'));

  for(let i = 0; i < headers.length; i++) {
    if(headers[i] == "") headers[i] = "Column" + i;
  }

  const data = lines.slice(1).map(line => {
    const cells = splitLine(line, delimiter, escapeChar).map(cell => cell.trim().replace(/^"(.*)"$/, '$1'));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = cells[index];
    });
    return obj;
  });

  return data;
}

function write(jsonArray, delimiter = ',', headers=null) {
  if (!jsonArray || !jsonArray.length) return '';
  
  // Collect all unique headers from all objects
  if(!headers) headers = [...new Set(
    jsonArray.reduce((acc, row) => {
      return acc.concat(Object.keys(row));
    }, [])
  )];

  const csv = [
    headers.join(delimiter),
    ...jsonArray.map(row =>
      headers.map(header => {
        let cell = row[header] === undefined || row[header] === null ? '' : row[header];
        // Convert cell to string to ensure .includes() works
        cell = String(cell);
        if (cell.includes(delimiter) || cell.includes('"')) {
          cell = `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(delimiter)
    )
  ].join('\n');
  return csv;
}

module.exports = {
  read,
  write
};
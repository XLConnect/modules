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

function write(jsonArray, delimiter = ',') {
  if (!jsonArray || !jsonArray.length) return '';
  const headers = Object.keys(jsonArray[0]);
  const csv = [
    headers.join(delimiter),
    ...jsonArray.map(row =>
      headers.map(header => {
        let cell = row[header] || '';
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

// Example usage:
// const csvParser = require('./csvParser');
// const csvString = `"Line Type";"Billing Country";"Billing Source";"Invoice Number";"Station Code";"Invoice Identifier";"Invoice Type";"Invoice Date";"Payment Terms";"Due Date";"Parent Account";"Billing Account";"Billing Account Name";"Billing Address 1";"Billing Address 2";"Billing Address 3";"Billing Postcode";"VAT Number";"Shipment Number";"Shipment Date";"Shipment Reference 1";"Shipment Reference 2";"Shipment Reference 3";"Product";"Product Name";"Pieces";"Unit Type";"Orig Name";"Orig Country Code";"Orig Country Name";"Senders Name";"Senders Address 1";"Senders Address 2";"Senders Address 3";"Senders Postcode";"Destination";"Dest Name";"Dest Country Code";"Dest Country Name";"Receivers Name";"Receivers Address 1";"Receivers Address 2";"Receivers Address 3";"Receivers Postcode";"Receivers Contact";"Cust Scale Weight (kg)";"DHL Scale Weight (kg)";"Cust Vol Weight (ltr)";"DHL Vol Weight (ltr)";"Weight Flag";"Weight (kg)";"Currency";"Total Amount";"Total Charge";"Tax Code";"Total Tax";"Tax Adjustment";"Invoice Fee";"Weight Charge";"Weight Tax (VAT)";"Other Charges 1";"Other Charges 1 Amount";"Other Charges 2";"Other Charges 2 Amount";"Discount 1";"Discount 1 Amount";"Discount 2";"Discount 2 Amount";"Discount 3";"Discount 3 Amount";"Total Extra Charges (XC)";"Total Extra Charges Tax";"XC1 Code";"XC1 Name";"XC1 Charge";"XC1 Tax Code";"XC1 Tax";"XC1 Discount";"XC1 Total";"XC2 Code";"XC2 Name";"XC2 Charge";"XC2 Tax Code";"XC2 Tax";"XC2 Discount";"XC2 Total";"XC3 Code";"XC3 Name";"XC3 Charge";"XC3 Tax Code";"XC3 Tax";"XC3 Discount";"XC3 Total";"XC4 Code";"XC4 Name";"XC4 Charge";"XC4 Tax Code";"XC4 Tax";"XC4 Discount";"XC4 Total";"XC5 Code";"XC5 Name";"XC5 Charge";"XC5 Tax Code";"XC5 Tax";"XC5 Discount";"XC5 Total";"XC6 Code";"XC6 Name";"XC6 Charge";"XC6 Tax Code";"XC6 Tax";"XC6 Discount";"XC6 Total";"XC7 Code";"XC7 Name";"XC7 Charge";"XC7 Tax Code";"XC7 Tax";"XC7 Discount";"XC7 Total";"

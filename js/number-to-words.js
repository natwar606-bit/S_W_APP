// Converts numbers to Indian currency words
function numberToIndianWords(amount) {
  if (isNaN(amount) || amount === null || amount === undefined || amount === '') return '';
  const num = Number(amount);
  if (num === 0) return 'Rupees Zero Only';

  const singleDigits = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const twoDigits = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tensMultiple = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n === 0) return '';
    if (n < 10) return singleDigits[n];
    if (n >= 10 && n < 20) return twoDigits[n - 10];
    const tens = Math.floor(n / 10);
    const rest = n % 10;
    return tensMultiple[tens] + (rest > 0 ? ' ' + singleDigits[rest] : '');
  }

  function convertThreeDigits(n) {
    let str = '';
    const hundreds = Math.floor(n / 100);
    const rest = n % 100;
    if (hundreds > 0) {
      str += singleDigits[hundreds] + ' Hundred';
      if (rest > 0) str += ' and ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const parts = num.toFixed(2).split('.');
  let integerPart = parseInt(parts[0], 10);
  const decimalPart = parseInt(parts[1], 10);

  if (integerPart === 0 && decimalPart === 0) return 'Rupees Zero Only';

  let words = '';

  if (integerPart > 0) {
    // Indian numbering format: Crores, Lakhs, Thousands, Hundreds
    const crore = Math.floor(integerPart / 10000000);
    integerPart %= 10000000;

    const lakh = Math.floor(integerPart / 100000);
    integerPart %= 100000;

    const thousand = Math.floor(integerPart / 1000);
    integerPart %= 1000;

    const remaining = integerPart;

    if (crore > 0) {
      words += convertTwoDigits(crore) + ' Crore ';
    }
    if (lakh > 0) {
      words += convertTwoDigits(lakh) + ' Lakh ';
    }
    if (thousand > 0) {
      words += convertTwoDigits(thousand) + ' Thousand ';
    }
    if (remaining > 0) {
      words += convertThreeDigits(remaining);
    }

    words = words.trim();
  }

  let finalStr = '';
  if (words) {
    finalStr = 'Rupees ' + words;
  }

  if (decimalPart > 0) {
    const paiseWords = convertTwoDigits(decimalPart);
    if (finalStr) {
      finalStr += ' and ' + paiseWords + ' Paise';
    } else {
      finalStr = paiseWords + ' Paise';
    }
  }

  return finalStr ? finalStr + ' Only' : '';
}

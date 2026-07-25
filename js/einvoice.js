// ===== Inkvoice — EN 16931 e-invoice (ZUGFeRD / Factur-X, XRechnung CII) =====
// Faithful JS port of the Android `ZugferdGenerator.kt` — the exact generator whose
// output passes the XRechnung online validator. Element ORDER, namespaces, the 0.00
// decimal format, the XML escaping (incl. ' → &apos;), the line-based address parsing
// and the VAT-prefix logic are all replicated 1:1. DO NOT reorder elements or change
// punctuation without re-validating against the KoSIT / online validator, or it can
// silently stop passing. See /home/.../Inkvoice/.../ZugferdGenerator.kt for the source.
import { shareFile } from './util.js';

// --- helpers (mirror the Kotlin private fns) ---------------------------------

// Escapes special XML characters. Order & entities match the Android escapeXml().
function escapeXml(text){
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Always "0.00" with a PERIOD separator (XML Schema requires '.', never ','),
// regardless of the user's locale — same as DecimalFormat("0.00", Locale.US).
function formatDecimal(value){ return (Number(value) || 0).toFixed(2); }

// ISO 3166-1 alpha-2, or default to DE if the value isn't a clean 2-letter code.
function validateCountryCode(code){
  const cleaned = String(code || '').trim().toUpperCase();
  return (/^[A-Z]{2}$/.test(cleaned) && cleaned !== 'XX') ? cleaned : 'DE';
}

// EN 16931 requires a country prefix on VAT IDs; add it if missing.
function formatVatId(vatId, countryCode){
  if(!vatId || !String(vatId).trim()) return '';
  const cleaned = String(vatId).trim();
  return /^[A-Z]{2}/.test(cleaned.slice(0, 2)) ? cleaned : (countryCode + cleaned);
}

// yyyyMMdd in LOCAL time (matches SimpleDateFormat("yyyyMMdd") on the device).
function compactDate(ms){
  if(!ms) return '';
  const d = new Date(Number(ms));
  if(isNaN(d)) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

// The web profile keeps a LIST of tax numbers (frozen onto the invoice); the Android
// model had a single `taxNumber`. Use the first frozen number as the seller VAT/tax
// registration — that mirrors the Android single-field behaviour.
function sellerTaxNumber(inv){
  const t = Array.isArray(inv.taxNumbers) ? inv.taxNumbers.find(x => x && String(x.number || '').trim()) : null;
  return t ? String(t.number).trim() : '';
}

// --- the generator -----------------------------------------------------------

export function buildEinvoiceXml(inv){
  const creationDateCompact = compactDate(inv.creationDateMillis);
  const dueDate = inv.dueDateMillis ? compactDate(inv.dueDateMillis) : '';
  const dueDateCompact = dueDate;

  const items = Array.isArray(inv.items) ? inv.items : [];

  // Parse addresses (multiline → line 0 street, 1 city, 2 postcode, 3 country).
  const sellerLines = String(inv.businessAddress || '').split('\n').map(s => s.trim()).filter(Boolean);
  const buyerLines  = String(inv.clientAddress   || '').split('\n').map(s => s.trim()).filter(Boolean);

  const sellerStreet     = sellerLines[0] || 'N/A';
  const sellerCity       = sellerLines[1] || 'N/A';
  const sellerPostalCode = sellerLines[2] || '00000';
  const sellerCountry    = validateCountryCode(sellerLines[3] || 'DE');

  const buyerStreet     = buyerLines[0] || 'N/A';
  const buyerCity       = buyerLines[1] || 'N/A';
  const buyerPostalCode = buyerLines[2] || '00000';
  const buyerCountry    = validateCountryCode(buyerLines[3] || 'DE');

  const taxRate = Number(inv.taxRatePercentage) || 0;
  const taxCategory = taxRate > 0 ? 'S' : 'Z';
  const bankInfo = String(inv.bankingInformation || '');
  const paymentMeansCode = bankInfo.trim() ? '30' : '1';

  // Line items
  const itemXml = items.map((item, index) => {
    const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
    return `
        <ram:IncludedSupplyChainTradeLineItem>
            <ram:AssociatedDocumentLineDocument>
                <ram:LineID>${index + 1}</ram:LineID>
            </ram:AssociatedDocumentLineDocument>
            <ram:SpecifiedTradeProduct>
                <ram:Name>${escapeXml(item.description)}</ram:Name>
            </ram:SpecifiedTradeProduct>
            <ram:SpecifiedLineTradeAgreement>
                <ram:NetPriceProductTradePrice>
                    <ram:ChargeAmount>${formatDecimal(item.unitPrice)}</ram:ChargeAmount>
                </ram:NetPriceProductTradePrice>
            </ram:SpecifiedLineTradeAgreement>
            <ram:SpecifiedLineTradeDelivery>
                <ram:BilledQuantity unitCode="C62">${formatDecimal(item.quantity)}</ram:BilledQuantity>
            </ram:SpecifiedLineTradeDelivery>
            <ram:SpecifiedLineTradeSettlement>
                <ram:ApplicableTradeTax>
                    <ram:TypeCode>VAT</ram:TypeCode>
                    <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
                    <ram:RateApplicablePercent>${formatDecimal(taxRate)}</ram:RateApplicablePercent>
                </ram:ApplicableTradeTax>
                <ram:SpecifiedTradeSettlementLineMonetarySummation>
                    <ram:LineTotalAmount>${formatDecimal(lineTotal)}</ram:LineTotalAmount>
                </ram:SpecifiedTradeSettlementLineMonetarySummation>
            </ram:SpecifiedLineTradeSettlement>
        </ram:IncludedSupplyChainTradeLineItem>`;
  }).join('\n');

  const buyerReferenceXml = (inv.buyerReference && String(inv.buyerReference).trim())
    ? `
        <ram:BuyerReference>${escapeXml(inv.buyerReference)}</ram:BuyerReference>` : '';

  const sTaxNum = sellerTaxNumber(inv);
  const sellerTaxIdXml = sTaxNum
    ? `
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">${escapeXml(formatVatId(sTaxNum, sellerCountry))}</ram:ID>
                </ram:SpecifiedTaxRegistration>` : '';

  const buyerTaxIdXml = (inv.clientVatId && String(inv.clientVatId).trim())
    ? `
                <ram:SpecifiedTaxRegistration>
                    <ram:ID schemeID="VA">${escapeXml(formatVatId(inv.clientVatId, buyerCountry))}</ram:ID>
                </ram:SpecifiedTaxRegistration>` : '';

  const paymentTermsXml = dueDate
    ? `
            <ram:SpecifiedTradePaymentTerms>
                <ram:DueDateDateTime>
                    <udt:DateTimeString format="102">${dueDateCompact}</udt:DateTimeString>
                </ram:DueDateDateTime>
            </ram:SpecifiedTradePaymentTerms>` : '';

  // Payment means (+ IBAN when we can find one in the free-text banking block).
  let paymentMeansXml;
  if(bankInfo.trim()){
    const bankLines = bankInfo.split('\n').map(s => s.trim()).filter(Boolean);
    let iban = '';
    for(const l of bankLines){
      const compact = l.replace(/ /g, '');
      if(/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(compact)){ iban = compact; break; }
    }
    if(iban){
      paymentMeansXml = `
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>${paymentMeansCode}</ram:TypeCode>
                <ram:PayeePartyCreditorFinancialAccount>
                    <ram:IBANID>${iban}</ram:IBANID>
                    <ram:AccountName>${escapeXml(inv.businessName)}</ram:AccountName>
                </ram:PayeePartyCreditorFinancialAccount>
            </ram:SpecifiedTradeSettlementPaymentMeans>`;
    } else {
      paymentMeansXml = `
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>${paymentMeansCode}</ram:TypeCode>
            </ram:SpecifiedTradeSettlementPaymentMeans>`;
    }
  } else {
    paymentMeansXml = `
            <ram:SpecifiedTradeSettlementPaymentMeans>
                <ram:TypeCode>${paymentMeansCode}</ram:TypeCode>
            </ram:SpecifiedTradeSettlementPaymentMeans>`;
  }

  // Seller contact — XRechnung BR-DE-5: PersonName + Telephone (before) + Email.
  const sellerContactXml = (String(inv.businessEmail || '').trim() && String(inv.businessPhone || '').trim())
    ? `
                <ram:DefinedTradeContact>
                    <ram:PersonName>${escapeXml(String(inv.businessName || '').trim() ? inv.businessName : 'Contact')}</ram:PersonName>
                    <ram:TelephoneUniversalCommunication><ram:CompleteNumber>${escapeXml(inv.businessPhone)}</ram:CompleteNumber></ram:TelephoneUniversalCommunication>
                    <ram:EmailURIUniversalCommunication><ram:URIID>${escapeXml(inv.businessEmail)}</ram:URIID></ram:EmailURIUniversalCommunication>
                </ram:DefinedTradeContact>` : '';

  const subtotal = Number(inv.subtotal) || 0;
  const discountPercent = Number(inv.discountPercent) || 0;
  const taxBasisAmount = subtotal - (subtotal * discountPercent / 100);
  const duePayableAmount = (Number(inv.grandTotal) || 0) - (Number(inv.advancePayment) || 0);

  const isB2GInvoice = !!(inv.buyerReference && String(inv.buyerReference).trim());

  const businessProcessXml = isB2GInvoice
    ? `
        <ram:BusinessProcessSpecifiedDocumentContextParameter>
            <ram:ID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</ram:ID>
        </ram:BusinessProcessSpecifiedDocumentContextParameter>` : '';

  const sellerEndpointXml = String(inv.businessEmail || '').trim()
    ? `
                <ram:URIUniversalCommunication>
                    <ram:URIID schemeID="EM">${escapeXml(inv.businessEmail)}</ram:URIID>
                </ram:URIUniversalCommunication>` : '';

  const buyerEndpointXml = String(inv.clientEmail || '').trim()
    ? `
                <ram:URIUniversalCommunication>
                    <ram:URIID schemeID="EM">${escapeXml(inv.clientEmail)}</ram:URIID>
                </ram:URIUniversalCommunication>` : '';

  const typeCode = inv.type === 'quotation' ? '325' : '380';

  return `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100" xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100" xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100" xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
    <rsm:ExchangedDocumentContext>${businessProcessXml}
        <ram:GuidelineSpecifiedDocumentContextParameter>
            <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0</ram:ID>
        </ram:GuidelineSpecifiedDocumentContextParameter>
    </rsm:ExchangedDocumentContext>
    <rsm:ExchangedDocument>
        <ram:ID>${escapeXml(inv.invoiceNumber)}</ram:ID>
        <ram:TypeCode>${typeCode}</ram:TypeCode>
        <ram:IssueDateTime>
            <udt:DateTimeString format="102">${creationDateCompact}</udt:DateTimeString>
        </ram:IssueDateTime>
    </rsm:ExchangedDocument>
    <rsm:SupplyChainTradeTransaction>
${itemXml}
        <ram:ApplicableHeaderTradeAgreement>${buyerReferenceXml}
            <ram:SellerTradeParty>
                <ram:Name>${escapeXml(inv.businessName)}</ram:Name>${sellerContactXml}
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${escapeXml(sellerPostalCode)}</ram:PostcodeCode>
                    <ram:LineOne>${escapeXml(sellerStreet)}</ram:LineOne>
                    <ram:CityName>${escapeXml(sellerCity)}</ram:CityName>
                    <ram:CountryID>${sellerCountry}</ram:CountryID>
                </ram:PostalTradeAddress>${sellerEndpointXml}${sellerTaxIdXml}
            </ram:SellerTradeParty>
            <ram:BuyerTradeParty>
                <ram:Name>${escapeXml(inv.clientName)}</ram:Name>
                <ram:PostalTradeAddress>
                    <ram:PostcodeCode>${escapeXml(buyerPostalCode)}</ram:PostcodeCode>
                    <ram:LineOne>${escapeXml(buyerStreet)}</ram:LineOne>
                    <ram:CityName>${escapeXml(buyerCity)}</ram:CityName>
                    <ram:CountryID>${buyerCountry}</ram:CountryID>
                </ram:PostalTradeAddress>${buyerEndpointXml}${buyerTaxIdXml}
            </ram:BuyerTradeParty>
        </ram:ApplicableHeaderTradeAgreement>
        <ram:ApplicableHeaderTradeDelivery>
            <ram:ActualDeliverySupplyChainEvent>
                <ram:OccurrenceDateTime>
                    <udt:DateTimeString format="102">${creationDateCompact}</udt:DateTimeString>
                </ram:OccurrenceDateTime>
            </ram:ActualDeliverySupplyChainEvent>
        </ram:ApplicableHeaderTradeDelivery>
        <ram:ApplicableHeaderTradeSettlement>
            <ram:InvoiceCurrencyCode>${inv.currency}</ram:InvoiceCurrencyCode>
${paymentMeansXml}
            <ram:ApplicableTradeTax>
                <ram:CalculatedAmount>${formatDecimal(inv.taxAmount)}</ram:CalculatedAmount>
                <ram:TypeCode>VAT</ram:TypeCode>
                <ram:BasisAmount>${formatDecimal(taxBasisAmount)}</ram:BasisAmount>
                <ram:CategoryCode>${taxCategory}</ram:CategoryCode>
                <ram:RateApplicablePercent>${formatDecimal(taxRate)}</ram:RateApplicablePercent>
            </ram:ApplicableTradeTax>
${paymentTermsXml}
            <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
                <ram:LineTotalAmount>${formatDecimal(inv.subtotal)}</ram:LineTotalAmount>
                <ram:TaxBasisTotalAmount>${formatDecimal(taxBasisAmount)}</ram:TaxBasisTotalAmount>
                <ram:TaxTotalAmount currencyID="${inv.currency}">${formatDecimal(inv.taxAmount)}</ram:TaxTotalAmount>
                <ram:GrandTotalAmount>${formatDecimal(inv.grandTotal)}</ram:GrandTotalAmount>
                <ram:TotalPrepaidAmount>${formatDecimal(inv.advancePayment)}</ram:TotalPrepaidAmount>
                <ram:DuePayableAmount>${formatDecimal(duePayableAmount)}</ram:DuePayableAmount>
            </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        </ram:ApplicableHeaderTradeSettlement>
    </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;
}

// --- file helpers (mirror pdfFilename / pdfBlob / openInvoicePdf) -------------

export function einvoiceFilename(inv){
  const kind = inv.type === 'quotation' ? 'Quote' : 'Invoice';
  return `${kind}-${String(inv.invoiceNumber || '').replace(/\s/g, '')}.xml`;
}
export function einvoiceBlob(inv){
  return new Blob([buildEinvoiceXml(inv)], { type: 'application/xml' });
}

// Open the .xml in a new browser tab (fallback: download) — same one-shot pattern
// as openInvoicePdf so a blocked pop-up still yields the file. Returns 'opened' |
// 'downloaded'.
export function openInvoiceXml(inv){
  const url = URL.createObjectURL(einvoiceBlob(inv));
  let how = 'opened';
  const win = window.open(url, '_blank');
  if(!win){
    const a = document.createElement('a');
    a.href = url; a.download = einvoiceFilename(inv);
    document.body.appendChild(a); a.click(); a.remove();
    how = 'downloaded';
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return how;
}

// Native share sheet with the .xml File where supported, else open/download.
export function shareInvoiceXml(inv){
  const file = new File([buildEinvoiceXml(inv)], einvoiceFilename(inv), { type: 'application/xml' });
  return shareFile(file, einvoiceFilename(inv));
}

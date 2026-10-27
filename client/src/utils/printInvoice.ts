import type { InvoiceLine, InvoiceRecord } from '../types/invoice'

const money = (value: number) =>
  `Rs. ${value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`

// Plain number with 2 decimals (no "Rs." prefix), used in the item rows
const num = (value: number) =>
  value.toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character]
  })

export function printInvoice(invoice: InvoiceRecord): void {
  const printWindow = window.open('', '_blank', 'width=460,height=800')

  if (!printWindow) {
    alert('Printing window blocked. Please allow pop-ups for this application.')
    return
  }

  // NOTE: `piecesPerUnit` (e.g. 24 pieces in 1 unit) and `mrp` (label price)
  // are placeholder field names. Rename them to match your InvoiceRecord line type.
  const lineFigures = (line: InvoiceLine) => {
    const perUnit = Number(line.piecesPerUnit || 0)
    const qty = Number(line.quantity || 0)
    const isUnit = line.quantityType === 'unit'

    const pieces = isUnit ? qty * (perUnit || 1) : qty
    const units = isUnit ? qty : perUnit ? pieces / perUnit : 0

    return {
      pieces,
      units,
      unitPrice: perUnit ? line.unitPrice * perUnit : 0,
    }
  }

  const itemRows = invoice.lines
    .map((line) => {
      const { pieces, units, unitPrice } = lineFigures(line)

      const qtyText = units ? `${pieces} (${units})` : `${pieces}`
      const priceText = unitPrice
        ? `${num(line.unitPrice)} (${num(unitPrice)})`
        : num(line.unitPrice)
      const nameText = line.sellingPrice
        ? `${escapeHtml(line.itemName)} - ${num(line.sellingPrice)}`
        : escapeHtml(line.itemName)

      return `
        <div class="item">
          <div class="item-name">${nameText}</div>
          <div class="item-cols">
            <span class="col-qty">${qtyText}</span>
            <span class="col-price">${priceText}</span>
            <span class="col-amt">${num(line.lineTotal)}</span>
          </div>
        </div>
      `
    })
    .join('')

  const createdDate = new Date(invoice.createdAt).toLocaleString('en-LK', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(invoice.invoiceNumber)}</title>

        <style>
          :root {
            /* Change the receipt font in this one place */
            --receipt-font: Verdana, Geneva, sans-serif;
          }

          @page {
            size: 80mm auto;
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            width: 70mm;
            margin: 0 auto;
            padding: 4mm 0;
            font-family: var(--receipt-font);
            font-size: 11px;
            font-weight: bold;
            color: #000;
            line-height: 1.35;
          }

          .center {
            text-align: center;
          }

          /* ---------- Header ---------- */
          .business-name {
            font-size: 24px;
            font-weight: 900;
            letter-spacing: 1px;
            overflow-wrap: anywhere;
          }

          .business-brand {
            font-size: 12px;
            font-weight: 900;
            margin-top: 4px;
          }

          .header-info {
            font-size: 11px;
            font-weight: bold;
            margin-top: 3px;
            overflow-wrap: anywhere;
          }

          .divider {
            border-top: 2px dashed #000;
            margin: 10px 0;
          }

          .divider-solid {
            border-top: 3px solid #000;
            margin: 10px 0;
          }

          .heading {
            font-weight: 900;
            font-size: 20px;
            text-align: center;
            letter-spacing: 2px;
          }

          .sub-heading {
            font-weight: 900;
            font-size: 16px;
            text-align: center;
            text-transform: uppercase;
            margin-bottom: 6px;
          }

          /* ---------- Invoice details ---------- */
          .info-row {
            display: flex;
            gap: 6px;
            margin: 5px 0;
            overflow-wrap: anywhere;
          }

          .info-label {
            min-width: 82px;
            font-weight: 900;
          }

          .info-value {
            flex: 1;
          }

          /* ---------- Items ---------- */
          .item {
            padding: 8px 0;
            border-bottom: 2px dashed #000;
            break-inside: avoid;
          }

          .item-name {
            font-weight: 900;
            font-size: 12px;
            overflow-wrap: anywhere;
          }

          .item-cols {
            display: grid;
            grid-template-columns: 0.8fr 2fr 1.1fr;
            gap: 3px;
            margin-top: 5px;
            font-size: 12px;
            font-weight: 900;
          }

          .item-head {
            font-size: 15px;
            margin: 0 0 4px;
          }

          .item-head span {
            border-bottom: 2px solid #000;
            padding-bottom: 2px;
          }

          .col-qty {
            text-align: left;
          }

          .col-price {
            text-align: center;
          }

          .col-amt {
            text-align: right;
          }

          /* ---------- Summary ---------- */
          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin: 6px 0;
            font-size: 14px;
            font-weight: 900;
          }

          .grand-total {
            font-size: 18px;
            font-weight: 900;
            padding: 3px 0;
          }

          .total-row span:last-child {
            white-space: nowrap;
          }

          /* ---------- Signatures ---------- */
          .signatures {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin-top: 38px;
          }

          .signature-box {
            flex: 1;
            text-align: center;
            font-size: 12px;
            font-weight: 900;
          }

          .signature-line {
            border-top: 2px solid #000;
            margin-bottom: 4px;
          }

          /* ---------- Footer ---------- */
          .thanks {
            text-align: center;
            font-size: 16px;
            font-weight: 900;
            margin-top: 18px;
          }

          .footer {
            text-align: center;
            margin-top: 10px;
            line-height: 1.5;
            font-size: 14px;
            font-weight: bold;
          }

          .footer strong {
            font-size: 15px;
            font-weight: 900;
          }

          .no-print {
            display: block;
            width: 100%;
            margin-bottom: 12px;
            padding: 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
          }

          @media print {
            .no-print {
              display: none !important;
            }

            body {
              width: 70mm;
              padding: 2mm 0;
            }
          }
        </style>
      </head>

      <body>
        <button class="no-print" onclick="window.print()">
          Print Receipt
        </button>

        <!-- Heading -->
        <div class="center">
          <div class="business-name">ARADHANA DISTRIBUTORS</div>
          <div class="header-info">Elpitiya Road, Hennathota, Dodanduwa.</div>
          <div class="header-info">Hotline : 071 313 5420</div>
          <div class="header-info">Tel : 091 227 5420</div>
          <div class="header-info">info.aradhanagroup@gmail.com</div>
        </div>

        <div class="divider-solid"></div>

        <!-- Invoice details -->
        <div class="sub-heading">Invoice Details</div>

        <div class="info-row">
          <span class="info-label">Invoice No:</span>
          <span class="info-value">${escapeHtml(invoice.invoiceNumber)}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${escapeHtml(createdDate)}</span>
        </div>

        <div class="info-row">
          <span class="info-label">Customer:</span>
          <span class="info-value">${escapeHtml(invoice.customerName || 'Walk-in Customer')}</span>
        </div>

        <div class="divider-solid"></div>

        <!-- Items -->
        <div class="item-cols item-head">
          <span class="col-qty">Qty</span>
          <span class="col-price">Price</span>
          <span class="col-amt">Amount</span>
        </div>

        ${itemRows}

        <!-- Totals -->
        <div class="total-row">
          <span>Items:</span>
          <span>${invoice.lines.length} item(s)</span>
        </div>

        <div class="total-row">
          <span>Subtotal</span>
          <span>${money(invoice.subtotal)}</span>
        </div>

        ${
            invoice.discount > 0
              ? `<div class="total-row">
                  <span>Discount</span>
                  <span>- ${money(invoice.discount)}</span>
                </div>`
              : ''
          }

        <div class="divider-solid"></div>

        <div class="total-row grand-total">
          <span>TOTAL</span>
          <span>${money(invoice.total)}</span>
        </div>

        <div class="divider-solid"></div>

        <!-- Signatures -->
        <div class="signatures">
          <div class="signature-box">
            <div class="signature-line"></div>
            Sales Rep Signature
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            Customer Signature
          </div>
        </div>

        <!-- Footer -->
        <div class="thanks">Thank you for your business!</div>

        <div class="divider"></div>

        <div class="footer">
          Distributed by:<br />
          <strong>Aradhana Group (Pvt) Ltd.</strong><br />
          www.aradhanagroup.lk
        </div>

        <script>
          setTimeout(() => {
            window.focus();
            window.print();
          }, 300);
        </script>
      </body>
    </html>
  `

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
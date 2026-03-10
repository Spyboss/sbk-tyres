import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
  },
  companyName: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  companyTagline: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  invoiceTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: '#1a1a1a',
  },
  invoiceNumber: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoColumn: {
    width: '48%',
  },
  infoLabel: {
    fontSize: 8,
    color: '#666',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  colBrand: {
    width: '30%',
  },
  colSize: {
    width: '20%',
  },
  colQty: {
    width: '15%',
    textAlign: 'right',
  },
  colPrice: {
    width: '17.5%',
    textAlign: 'right',
  },
  colTotal: {
    width: '17.5%',
    textAlign: 'right',
  },
  headerText: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
    color: '#374151',
  },
  cellText: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  totalsSection: {
    marginTop: 20,
    alignItems: 'flex-end',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 200,
    paddingVertical: 4,
  },
  totalsLabel: {
    fontSize: 10,
    color: '#666',
  },
  totalsValue: {
    fontSize: 10,
    color: '#1a1a1a',
  },
  grandTotal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#1a1a1a',
    paddingTop: 8,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 40,
    right: 40,
    textAlign: 'center',
    fontSize: 8,
    color: '#666',
  },
})

interface InvoiceItem {
  brand: string
  size: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

interface InvoiceData {
  orderId: string
  dealerName: string
  dealerEmail: string
  orderDate: string
  shippingType: string
  items: InvoiceItem[]
  subtotal: number
  shippingCost: number
  grandTotal: number
}

export function InvoiceTemplate({ data }: { data: InvoiceData }) {
  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-AU', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.companyName}>SBK Tyre Distributors</Text>
            <Text style={styles.companyTagline}>Quality Tyres & Wheels</Text>
          </View>
          <View>
            <Text style={styles.invoiceTitle}>INVOICE</Text>
            <Text style={styles.invoiceNumber}>#{data.orderId.slice(0, 8).toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Order Information</Text>
            <Text style={styles.infoLabel}>Order ID</Text>
            <Text style={styles.infoValue}>{data.orderId.slice(0, 8).toUpperCase()}</Text>
            <Text style={{ marginTop: 8 }}></Text>
            <Text style={styles.infoLabel}>Order Date</Text>
            <Text style={styles.infoValue}>{formatDate(data.orderDate)}</Text>
            <Text style={{ marginTop: 8 }}></Text>
            <Text style={styles.infoLabel}>Delivery Type</Text>
            <Text style={styles.infoValue}>
              {data.shippingType === 'pickup' ? 'Store Pickup' : 'Delivery'}
            </Text>
          </View>
          <View style={styles.infoColumn}>
            <Text style={styles.sectionTitle}>Bill To</Text>
            <Text style={styles.infoLabel}>Dealer Name</Text>
            <Text style={styles.infoValue}>{data.dealerName}</Text>
            <Text style={{ marginTop: 8 }}></Text>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{data.dealerEmail}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colBrand, styles.headerText]}>Brand</Text>
            <Text style={[styles.colSize, styles.headerText]}>Size</Text>
            <Text style={[styles.colQty, styles.headerText]}>Qty</Text>
            <Text style={[styles.colPrice, styles.headerText]}>Unit Price</Text>
            <Text style={[styles.colTotal, styles.headerText]}>Line Total</Text>
          </View>
          {data.items.map((item, index) => (
            <View key={index} style={styles.tableRow}>
              <Text style={[styles.colBrand, styles.cellText]}>{item.brand}</Text>
              <Text style={[styles.colSize, styles.cellText]}>{item.size}</Text>
              <Text style={[styles.colQty, styles.cellText]}>{item.quantity}</Text>
              <Text style={[styles.colPrice, styles.cellText]}>{formatCurrency(item.unitPrice)}</Text>
              <Text style={[styles.colTotal, styles.cellText]}>{formatCurrency(item.lineTotal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totalsSection}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(data.subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Shipping</Text>
            <Text style={styles.totalsValue}>
              {data.shippingCost > 0 ? formatCurrency(data.shippingCost) : 'TBD'}
            </Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={[styles.totalsLabel, styles.grandTotal]}>Grand Total</Text>
            <Text style={[styles.totalsValue, styles.grandTotal]}>
              {formatCurrency(data.grandTotal)}
            </Text>
          </View>
        </View>

        <Text style={styles.footer}>
          Thank you for your business!
        </Text>
      </Page>
    </Document>
  )
}

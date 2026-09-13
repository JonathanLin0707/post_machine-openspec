async function main() {
  const seed = await fetch('http://localhost/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'E2E Product', price: 100, category: 'test', stock: 10 }) })
  console.log('SEED STATUS:', seed.status)
  console.log('SEED BODY:', await seed.text())

  const all = await fetch('http://localhost/api/products')
  console.log('ALL PRODUCTS:', await all.text())
}

main().catch(err => { console.error(err); process.exit(1) })

fetch('https://tsehaycampus.com').then(r => r.text()).then(t => console.log(t.includes('href="/#courses"'))).catch(console.error)

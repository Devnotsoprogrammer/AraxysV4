async function handleRateLimit() {
    await new Promise((resolve) => setTimeout(resolve, 1000));
}

module.exports = async (client) => {
    client.on('guildBanAdd', async (ban) =>{
        
    });
}
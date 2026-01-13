const escpos = require('escpos');
escpos.USB = require('escpos-usb');

console.log('🔍 Procurando impressoras USB...\n');

try {
  const devices = escpos.USB.findPrinter();
  
  console.log(`📊 Total de impressoras encontradas: ${devices.length}\n`);
  
  if (devices.length === 0) {
    console.log('❌ Nenhuma impressora detectada!\n');
    console.log('Verificações necessárias:');
    console.log('1. A impressora está ligada?');
    console.log('2. O cabo USB está conectado?');
    console.log('3. A impressora está sendo reconhecida pelo Windows?');
    console.log('   (Verifique em: Painel de Controle > Dispositivos e Impressoras)\n');
  } else {
    devices.forEach((device, index) => {
      console.log(`\n🖨️  Impressora ${index + 1}:`);
      console.log('   Vendor ID:', device.deviceDescriptor.idVendor);
      console.log('   Product ID:', device.deviceDescriptor.idProduct);
      console.log('   Fabricante:', device.deviceDescriptor.iManufacturer);
      console.log('   Produto:', device.deviceDescriptor.iProduct);
    });
  }
  
} catch (error) {
  console.error('❌ Erro ao buscar impressoras:', error.message);
  console.log('\n⚠️  Possível causa: Drivers USB não instalados ou permissões insuficientes');
}

console.log('\n✅ Diagnóstico concluído!');
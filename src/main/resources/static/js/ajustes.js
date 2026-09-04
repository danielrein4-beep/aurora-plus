const AjustesModule = (() => {
  function init() {
    // Simulate loading settings
    document.getElementById('a-empresa').value = "Empresa Demo ERP, C.A.";
    document.getElementById('a-rif').value = "J-12345678-9";
    document.getElementById('a-iva').value = "16.0";
    document.getElementById('a-tonelada').value = "45.00";
  }

  function guardarAjustes() {
    const empresa = document.getElementById('a-empresa').value;
    const rif = document.getElementById('a-rif').value;
    
    Toast.show('Ajustes guardados correctamente', 'success');
    
    // Update visual aspects if needed
    if (empresa) {
      document.querySelector('.sidebar-header h2').textContent = empresa;
    }
  }

  return { init, guardarAjustes };
})();

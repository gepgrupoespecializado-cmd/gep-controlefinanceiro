export function renderErrorPage(): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>Controle de Prestação de Serviços GEP</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,body{height:100%;margin:0;background:#0b1b3d;color:#fff;font:15px/1.5 system-ui,-apple-system,sans-serif}
      .wrap{min-height:100vh;display:grid;place-items:center;padding:1.5rem;text-align:center}
      .brand{font-weight:800;letter-spacing:.2px;font-size:1.05rem;margin-bottom:.75rem;opacity:.95}
      .spinner{width:34px;height:34px;border-radius:50%;border:3px solid rgba(255,255,255,.25);border-top-color:#fff;animation:spin 1s linear infinite;margin:0 auto .75rem}
      p{opacity:.85;margin:.25rem 0}
      @keyframes spin{to{transform:rotate(360deg)}}
    </style>
    <script>
      (function(){
        try{
          var k='gep_boot_retry';
          var n=parseInt(sessionStorage.getItem(k)||'0',10);
          if(n<2){sessionStorage.setItem(k,String(n+1));setTimeout(function(){location.reload()},700);}
          else{sessionStorage.removeItem(k);}
        }catch(e){setTimeout(function(){location.reload()},1200);}
      })();
    </script>
  </head>
  <body>
    <div class="wrap">
      <div>
        <div class="brand">Controle de Prestação de Serviços GEP</div>
        <div class="spinner" aria-hidden="true"></div>
        <p>Carregando…</p>
      </div>
    </div>
  </body>
</html>`;
}

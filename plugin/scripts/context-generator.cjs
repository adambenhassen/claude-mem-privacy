"use strict";var rs=Object.create;var B=Object.defineProperty;var ns=Object.getOwnPropertyDescriptor;var os=Object.getOwnPropertyNames;var is=Object.getPrototypeOf,as=Object.prototype.hasOwnProperty;var ds=(r,e)=>{for(var t in e)B(r,t,{get:e[t],enumerable:!0})},Ne=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of os(e))!as.call(r,n)&&n!==t&&B(r,n,{get:()=>e[n],enumerable:!(s=ns(e,n))||s.enumerable});return r};var L=(r,e,t)=>(t=r!=null?rs(is(r)):{},Ne(e||!r||!r.__esModule?B(t,"default",{value:r,enumerable:!0}):t,r)),_s=r=>Ne(B({},"__esModule",{value:!0}),r);var Vs={};ds(Vs,{generateContext:()=>ss,generateContextWithStats:()=>Ce});module.exports=_s(Vs);var Qt=L(require("path"),1),es=require("os"),ts=require("fs");var Se=require("bun:sqlite");var g=require("path"),de=require("os"),M=require("fs");var De=require("url");var N=require("fs"),Le=require("path");var cs=null;function Es(r){return(cs??process.stderr.write.bind(process.stderr))(r)}function ne(r){Es(r)}var ie=(o=>(o[o.DEBUG=0]="DEBUG",o[o.INFO=1]="INFO",o[o.WARN=2]="WARN",o[o.ERROR=3]="ERROR",o[o.SILENT=4]="SILENT",o))(ie||{}),oe=null,ae=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=P.logsDir();(0,N.existsSync)(e)||(0,N.mkdirSync)(e,{recursive:!0});let t=new Date().toISOString().split("T")[0];this.logFilePath=(0,Le.join)(e,`claude-mem-${t}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e instanceof Error?e.message:String(e)),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=P.settings();if((0,N.existsSync)(e)){let t=(0,N.readFileSync)(e,"utf-8"),n=(JSON.parse(t).CLAUDE_MEM_LOG_LEVEL||"INFO").toUpperCase();this.level=ie[n]??1}else this.level=1}catch(e){console.error("[LOGGER] Failed to load log level from settings:",e instanceof Error?e.message:String(e)),this.level=1}return this.level}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let t=Object.keys(e);return t.length===0?"{}":t.length<=3?JSON.stringify(e):`{${t.length} keys: ${t.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,t){if(!t)return e;let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{s=t}if(e==="Bash"&&s.command)return`${e}(${s.command})`;if(s.file_path)return`${e}(${s.file_path})`;if(s.notebook_path)return`${e}(${s.notebook_path})`;if(e==="Glob"&&s.pattern)return`${e}(${s.pattern})`;if(e==="Grep"&&s.pattern)return`${e}(${s.pattern})`;if(s.url)return`${e}(${s.url})`;if(s.query)return`${e}(${s.query})`;if(e==="Task"){if(s.subagent_type)return`${e}(${s.subagent_type})`;if(s.description)return`${e}(${s.description})`}return e==="Skill"&&s.skill?`${e}(${s.skill})`:e==="LSP"&&s.operation?`${e}(${s.operation})`:e}formatTimestamp(e){let t=e.getFullYear(),s=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0"),a=String(e.getSeconds()).padStart(2,"0"),d=String(e.getMilliseconds()).padStart(3,"0");return`${t}-${s}-${n} ${o}:${i}:${a}.${d}`}log(e,t,s,n,o){if(e<this.getLevel())return;this.ensureLogFileInitialized();let i=this.formatTimestamp(new Date),a=ie[e].padEnd(5),d=t.padEnd(6),_="";n?.correlationId?_=`[${n.correlationId}] `:n?.sessionId&&(_=`[session-${n.sessionId}] `);let c="";if(o!=null)if(o instanceof Error)c=this.getLevel()===0?`
${o.message}
${o.stack}`:` ${o.message}`;else if(this.getLevel()===0&&typeof o=="object")try{c=`
`+JSON.stringify(o,null,2)}catch{c=" "+this.formatData(o)}else c=" "+this.formatData(o);let u="";if(n){let{sessionId:m,memorySessionId:A,correlationId:R,...p}=n;Object.keys(p).length>0&&(u=` {${Object.entries(p).map(([b,S])=>`${b}=${S}`).join(", ")}}`)}let f=`[${i}] [${a}] [${d}] ${_}${s}${u}${c}`;if(this.logFilePath)try{(0,N.appendFileSync)(this.logFilePath,f+`
`,"utf8")}catch(m){ne(`[LOGGER] Failed to write to log file: ${m instanceof Error?m.message:String(m)}
`)}else ne(f+`
`)}debug(e,t,s,n){this.log(0,e,t,s,n)}info(e,t,s,n){this.log(1,e,t,s,n)}warn(e,t,s,n){this.log(2,e,t,s,n)}setErrorSink(e){oe=e}error(e,t,s,n){this.log(3,e,t,s,n),this.routeErrorToSink(t,s,n)}routeErrorToSink(e,t,s){try{if(!oe||!(s instanceof Error))return;oe(s)}catch{}}dataIn(e,t,s,n){this.info(e,`\u2192 ${t}`,s,n)}dataOut(e,t,s,n){this.info(e,`\u2190 ${t}`,s,n)}success(e,t,s,n){this.info(e,`\u2713 ${t}`,s,n)}failure(e,t,s,n){this.error(e,`\u2717 ${t}`,s,n)}happyPathError(e,t,s,n,o=""){let _=((new Error().stack||"").split(`
`)[2]||"").match(/at\s+(?:.*\s+)?\(?([^:]+):(\d+):(\d+)\)?/),c=_?`${_[1].split("/").pop()}:${_[2]}`:"unknown",u={...s,location:c};return this.warn(e,`[HAPPY-PATH] ${t}`,u,n),o}},l=new ae;var bs={};function ls(){return typeof __dirname<"u"?__dirname:(0,g.dirname)((0,De.fileURLToPath)(bs.url))}var us=ls();function ms(){if(process.env.CLAUDE_MEM_DATA_DIR)return process.env.CLAUDE_MEM_DATA_DIR;let r=(0,g.join)((0,de.homedir)(),".claude-mem"),e=(0,g.join)(r,"settings.json");try{if((0,M.existsSync)(e)){let t=JSON.parse((0,M.readFileSync)(e,"utf-8")),s=t.env??t;if(s.CLAUDE_MEM_DATA_DIR)return s.CLAUDE_MEM_DATA_DIR}}catch{}return r}var O=ms(),y=process.env.CLAUDE_CONFIG_DIR||(0,g.join)((0,de.homedir)(),".claude"),sr=(0,g.join)(y,"plugins","marketplaces","thedotmack"),ps=(0,g.join)(O,"archives"),gs=(0,g.join)(O,"logs"),Ts=(0,g.join)(O,"trash"),fs=(0,g.join)(O,"backups"),Ss=(0,g.join)(O,"modes"),rr=(0,g.join)(O,"settings.json"),Me=(0,g.join)(O,"claude-mem.db"),As=(0,g.join)(O,"vector-db"),ye=(0,g.join)(O,"observer-sessions"),_e=(0,g.basename)(ye),nr=(0,g.join)(y,"settings.json"),or=(0,g.join)(y,"commands"),ir=(0,g.join)(y,"CLAUDE.md");function ve(r){(0,M.mkdirSync)(r,{recursive:!0})}function Ue(){return(0,g.join)(us,"..")}var P={dataDir:()=>O,workerPid:()=>(0,g.join)(O,"worker.pid"),serverBetaPid:()=>(0,g.join)(O,".server-beta.pid"),serverBetaPort:()=>(0,g.join)(O,".server-beta.port"),serverBetaRuntime:()=>(0,g.join)(O,".server-beta.runtime.json"),settings:()=>(0,g.join)(O,"settings.json"),database:()=>(0,g.join)(O,"claude-mem.db"),chroma:()=>(0,g.join)(O,"chroma"),combinedCerts:()=>(0,g.join)(O,"combined_certs.pem"),transcriptsConfig:()=>(0,g.join)(O,"transcript-watch.json"),transcriptsState:()=>(0,g.join)(O,"transcript-watch-state.json"),corpora:()=>(0,g.join)(O,"corpora"),supervisorRegistry:()=>(0,g.join)(O,"supervisor.json"),envFile:()=>(0,g.join)(O,".env"),logsDir:()=>gs,archives:()=>ps,trash:()=>Ts,backups:()=>fs,modes:()=>Ss,vectorDb:()=>As,observerSessions:()=>ye};var xe=require("crypto");function ce(r,e,t){return(0,xe.createHash)("sha256").update([r||"",e||"",t||""].join("\0")).digest("hex").slice(0,16)}function Ee(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[String(e)]}catch{return[r]}}var h="claude";function Rs(r){return r.trim().toLowerCase().replace(/\s+/g,"-")}function v(r){if(!r)return h;let e=Rs(r);return e?e==="transcript"||e.includes("codex")?"codex":e.includes("cursor")?"cursor":e.includes("claude")?"claude":e:h}function Pe(r){let e=["claude","codex","cursor"];return[...r].sort((t,s)=>{let n=e.indexOf(t),o=e.indexOf(s);return n!==-1||o!==-1?n===-1?1:o===-1?-1:n-o:t.localeCompare(s)})}function we(r,e,t,s){let n=Date.now()-s;return r.prepare(`
    SELECT
      up.*,
      s.memory_session_id,
      s.project,
      COALESCE(s.platform_source, '${h}') as platform_source
    FROM user_prompts up
    JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
    WHERE up.content_session_id = ?
      AND up.prompt_text = ?
      AND up.created_at_epoch >= ?
    ORDER BY up.created_at_epoch DESC
    LIMIT 1
  `).get(e,t,n)??void 0}var $e=["private","claude-mem-context","system_instruction","system-instruction","persisted-output","system-reminder"],ke=new RegExp(`<(${$e.join("|")})\\b[^>]*>[\\s\\S]*?</\\1>`,"g"),He=/<system-reminder>[\s\S]*?<\/system-reminder>/g,Fe=100;function Os(r){let e=Object.fromEntries($e.map(n=>[n,0]));ke.lastIndex=0;let t=0,s=r.replace(ke,(n,o)=>(e[o]=(e[o]??0)+1,t+=1,""));return t>Fe&&l.warn("SYSTEM","tag count exceeds limit",void 0,{tagCount:t,maxAllowed:Fe,contentLength:r.length}),{stripped:s.trim(),counts:e}}function Ge(r){return Os(r).stripped}var hs=["task-notification"],mr=new RegExp(`^\\s*<(${hs.join("|")})\\b[^>]*>(?:(?!<\\1\\b|</\\1\\b)[\\s\\S])*</\\1>\\s*$`),pr=256*1024;var le=4e3;function W(r){let e=r.trim(),s=Ge(r).trim()||e;return s.length<=le?s:(l.debug("DB","Truncated stored prompt text to the configured cap",{originalLength:s.length,storedLength:le}),`${s.slice(0,le-1)}\u2026`)}var Cs=/^(?:your[_-]?\w*|changeme|your-key-here|example\w*|x{3,}|<[^>]*>|\$\{?\w+\}?|[A-Z][A-Z0-9_]{2,})$/i;function Is(r){return Cs.test(r.trim())}function Ns(r){let e=r.replace(/[ -]/g,"");if(!/^\d{13,19}$/.test(e))return!1;let t=0,s=!1;for(let n=e.length-1;n>=0;n--){let o=e.charCodeAt(n)-48;s&&(o*=2,o>9&&(o-=9)),t+=o,s=!s}return t%10===0}var ue=/\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b/g,je=/(?<![\w.])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]\d{2,4}){1,3}(?![\w])/g,Xe=/\b\d{1,5}\s+(?:[A-Z][a-zA-Z]+\s){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Square|Sq|Terrace|Ter)\b\.?/g,Be=[{category:"SECRETS",label:"PRIVATE_KEY",regex:/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]{0,8000}?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g},{category:"SECRETS",label:"PRIVATE_KEY",regex:/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g},{category:"SECRETS",label:"SSH_KEY",regex:/\bssh-(?:rsa|ed25519|dss)\s+AAAA[A-Za-z0-9+/=]{20,}/g},{category:"SECRETS",label:"JWT",regex:/\beyJ[A-Za-z0-9_-]{3,512}\.eyJ[A-Za-z0-9_-]{3,512}\.[A-Za-z0-9_-]{3,512}/g},{category:"SECRETS",label:"ANTHROPIC_KEY",regex:/\bsk-ant-[A-Za-z0-9_-]{8,}/g},{category:"SECRETS",label:"OPENROUTER_KEY",regex:/\bsk-or-v1-[A-Za-z0-9]{8,}/g},{category:"SECRETS",label:"LANGFUSE_KEY",regex:/\bsk-lf-[A-Za-z0-9-]{8,}/g},{category:"SECRETS",label:"OPENAI_PROJECT_KEY",regex:/\bsk-proj-[A-Za-z0-9_-]{8,}/g},{category:"SECRETS",label:"CONTEXT7_KEY",regex:/\bctx7sk-[A-Za-z0-9]{8,}/g},{category:"SECRETS",label:"GITHUB_PAT",regex:/\b(?:gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g},{category:"SECRETS",label:"GITLAB_PAT",regex:/\bglpat-[A-Za-z0-9_-]{20,}/g},{category:"SECRETS",label:"AWS_ACCESS_KEY",regex:/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g},{category:"SECRETS",label:"GOOGLE_API_KEY",regex:/\bAIza[0-9A-Za-z_-]{35}\b/g},{category:"SECRETS",label:"SLACK_TOKEN",regex:/\bxox[baprs]-[A-Za-z0-9-]{8,}/g},{category:"SECRETS",label:"STRIPE_KEY",regex:/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g},{category:"SECRETS",label:"SENDGRID_KEY",regex:/\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g},{category:"SECRETS",label:"HUGGINGFACE_TOKEN",regex:/\bhf_[A-Za-z0-9]{16,}/g},{category:"SECRETS",label:"REPLICATE_TOKEN",regex:/\br8_[A-Za-z0-9]{16,}/g},{category:"SECRETS",label:"DIGITALOCEAN_TOKEN",regex:/\bdop_v1_[A-Za-z0-9]{32,}/g},{category:"SECRETS",label:"NPM_TOKEN",regex:/\bnpm_[A-Za-z0-9]{36}\b/g},{category:"SECRETS",label:"PYPI_TOKEN",regex:/\bpypi-[A-Za-z0-9_-]{16,}/g},{category:"SECRETS",label:"SHOPIFY_TOKEN",regex:/\b(?:shpat|shppa)_[A-Fa-f0-9]{32}\b/g},{category:"SECRETS",label:"GENERIC_API_KEY",regex:/\bsk-[A-Za-z0-9]{20,}\b/g},{category:"SECRETS",label:"BEARER_TOKEN",regex:/\bBearer\s+[A-Za-z0-9._-]{8,}/g},{category:"SECRETS",label:"BASIC_AUTH",regex:/\b([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi,replace:(r,e)=>`${e}[REDACTED:BASIC_AUTH]@`},{category:"SECRETS",label:"SECRET",regex:/\b(password|passwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|auth[_-]?token)(\s*[:=]\s*)(?:"([^"]{1,200})"|'([^']{1,200})'|([^\s"']{8,200}))/gi,replace:(r,e,t,s,n,o)=>{let i=s??n??o??"",a=s!==void 0||n!==void 0;return Is(i)||!a&&i.length<8?r:`${e}${t}[REDACTED:SECRET]`}},{category:"FINANCIAL",label:"CREDIT_CARD",regex:/\b(?:\d[ -]?){13,19}\b/g,replace:r=>Ns(r)?"[REDACTED:CREDIT_CARD]":r},{category:"FINANCIAL",label:"IBAN",regex:/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g},{category:"FINANCIAL",label:"ETH_ADDRESS",regex:/\b0x[0-9a-fA-F]{40}\b/g},{category:"FINANCIAL",label:"BTC_ADDRESS",regex:/\b(?:bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g},{category:"NATIONAL_ID",label:"US_SSN",regex:/\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g},{category:"NATIONAL_ID",label:"US_EIN",regex:/\b\d{2}-\d{7}\b/g},{category:"NATIONAL_ID",label:"EU_VAT",regex:/\b(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)[0-9A-Z]{8,12}\b/g},{category:"NATIONAL_ID",label:"UA_TAX_ID",regex:/(?:ІПН|ИНН|РНОКПП|tax(?:payer)?\s*(?:id|number))\D{0,10}\d{10}\b/gi,replace:r=>r.replace(/\d{10}\b/,"[REDACTED:UA_TAX_ID]")},{category:"GEO",label:"GEO_COORD",regex:/\b[-+]?(?:90(?:\.0+)?|[0-8]?\d\.\d{3,}),\s*[-+]?(?:180(?:\.0+)?|1[0-7]\d\.\d{3,}|\d?\d\.\d{3,})\b/g}];var We=require("node:child_process"),K=null;function me(r,e){try{let t=(0,We.execFileSync)("git",r,{cwd:e,encoding:"utf8",stdio:["ignore","pipe","ignore"]});return typeof t=="string"?t.trim():""}catch{return""}}function Ls(r=process.cwd()){if(K)return K;let e=new Set,t=new Set,s=new Set,n=(o,i)=>{if(o&&e.add(o),i){t.add(i);let a=i.split("@")[0]??"";a.length>=3&&s.add(a)}};return n(me(["config","--global","user.name"]),me(["config","--global","user.email"])),n("",me(["config","user.email"],r)),K={names:[...e],emails:[...t],handles:[...s]},K}var pe=r=>r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");function Ke(r=Ls()){let e=[];for(let t of r.emails)e.push({category:"OPERATOR",label:"OPERATOR_EMAIL",regex:new RegExp(pe(t),"gi")});for(let t of r.names)e.push({category:"OPERATOR",label:"OPERATOR_NAME",regex:new RegExp(`\\b${pe(t)}\\b`,"gi")});for(let t of r.handles)e.push({category:"OPERATOR",label:"OPERATOR_HANDLE",regex:new RegExp(`\\b${pe(t)}\\b`,"gi")});return e}var Je=L(require("os"),1),fe=L(require("path"),1);var I=require("fs"),w=require("path"),Te=require("os");var ge={DEFAULT:3e5,HEALTH_CHECK:3e3,API_REQUEST:3e4,HOOK_READINESS_WAIT:1e4,POST_SPAWN_WAIT:15e3,READINESS_WAIT:3e4,PORT_IN_USE_WAIT:3e3,WORKER_STARTUP_WAIT:1e3,PRE_RESTART_SETTLE_DELAY:2e3,POWERSHELL_COMMAND:1e4,WINDOWS_MULTIPLIER:1.5};function Ye(r){return process.platform==="win32"?Math.round(r*ge.WINDOWS_MULTIPLIER):r}var U=class{static DEFAULTS={CLAUDE_MEM_MODEL:"claude-haiku-4-5-20251001",CLAUDE_MEM_CONTEXT_OBSERVATIONS:"50",CLAUDE_MEM_WORKER_PORT:String(37700+(process.getuid?.()??77)%100),CLAUDE_MEM_WORKER_HOST:"127.0.0.1",CLAUDE_MEM_API_TIMEOUT_MS:String(Ye(ge.API_REQUEST)),CLAUDE_MEM_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",CLAUDE_MEM_PROVIDER:"claude",CLAUDE_MEM_CLAUDE_AUTH_METHOD:"subscription",CLAUDE_MEM_GEMINI_API_KEY:"",CLAUDE_MEM_GEMINI_MODEL:"gemini-2.5-flash-lite",CLAUDE_MEM_GEMINI_RATE_LIMITING_ENABLED:"true",CLAUDE_MEM_GEMINI_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_GEMINI_MAX_TOKENS:"100000",CLAUDE_MEM_OPENROUTER_API_KEY:"",CLAUDE_MEM_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",CLAUDE_MEM_OPENROUTER_BASE_URL:"",CLAUDE_MEM_OPENROUTER_SITE_URL:"",CLAUDE_MEM_OPENROUTER_APP_NAME:"claude-mem",CLAUDE_MEM_OPENROUTER_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_OPENROUTER_MAX_TOKENS:"100000",CLAUDE_MEM_CUSTOM_API_KEY:"",CLAUDE_MEM_CUSTOM_MODEL:"",CLAUDE_MEM_CUSTOM_BASE_URL:"",CLAUDE_MEM_DATA_DIR:(0,w.join)((0,Te.homedir)(),".claude-mem"),CLAUDE_MEM_LOG_LEVEL:"INFO",CLAUDE_MEM_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",CLAUDE_MEM_MODE:"code",CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT:"true",CLAUDE_MEM_CONTEXT_FULL_COUNT:"0",CLAUDE_MEM_CONTEXT_FULL_FIELD:"narrative",CLAUDE_MEM_CONTEXT_SESSION_COUNT:"10",CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY:"true",CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE:"false",CLAUDE_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT:"true",CLAUDE_MEM_WELCOME_HINT_ENABLED:"true",CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED:"false",CLAUDE_MEM_FOLDER_USE_LOCAL_MD:"false",CLAUDE_MEM_TRANSCRIPTS_ENABLED:"true",CLAUDE_MEM_TRANSCRIPTS_CONFIG_PATH:(0,w.join)((0,Te.homedir)(),".claude-mem","transcript-watch.json"),CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION:"false",CLAUDE_MEM_MAX_CONCURRENT_AGENTS:"2",CLAUDE_MEM_HOOK_FAIL_LOUD_THRESHOLD:"3",CLAUDE_MEM_ALLOWED_PROJECTS:"",CLAUDE_MEM_EXCLUDED_PROJECTS:"",CLAUDE_MEM_FOLDER_MD_EXCLUDE:"[]",CLAUDE_MEM_FOLDER_MD_SKELETON_DENYLIST:"[]",CLAUDE_MEM_SEMANTIC_INJECT:"false",CLAUDE_MEM_SEMANTIC_INJECT_LIMIT:"5",CLAUDE_MEM_TIER_ROUTING_ENABLED:"true",CLAUDE_MEM_TIER_SIMPLE_MODEL:"haiku",CLAUDE_MEM_TIER_SUMMARY_MODEL:"",CLAUDE_MEM_TIER_FAST_MODEL:"haiku",CLAUDE_MEM_TIER_SMART_MODEL:"sonnet",CLAUDE_MEM_CHROMA_ENABLED:"true",CLAUDE_MEM_CHROMA_MODE:"local",CLAUDE_MEM_CHROMA_HOST:"127.0.0.1",CLAUDE_MEM_CHROMA_PORT:"8000",CLAUDE_MEM_CHROMA_SSL:"false",CLAUDE_MEM_CHROMA_API_KEY:"",CLAUDE_MEM_CHROMA_TENANT:"default_tenant",CLAUDE_MEM_CHROMA_DATABASE:"default_database",CLAUDE_MEM_TELEGRAM_ENABLED:"true",CLAUDE_MEM_TELEGRAM_BOT_TOKEN:"",CLAUDE_MEM_TELEGRAM_CHAT_ID:"",CLAUDE_MEM_TELEGRAM_TRIGGER_TYPES:"security_alert",CLAUDE_MEM_TELEGRAM_TRIGGER_CONCEPTS:"",CLAUDE_MEM_QUEUE_ENGINE:"sqlite",CLAUDE_MEM_REDIS_URL:"",CLAUDE_MEM_REDIS_HOST:"127.0.0.1",CLAUDE_MEM_REDIS_PORT:"6379",CLAUDE_MEM_REDIS_MODE:"external",CLAUDE_MEM_QUEUE_REDIS_PREFIX:`claude_mem_${process.env.CLAUDE_MEM_WORKER_PORT??String(37700+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_AUTH_MODE:"api-key",CLAUDE_MEM_RUNTIME:"worker",CLAUDE_MEM_SERVER_BETA_URL:`http://127.0.0.1:${process.env.CLAUDE_MEM_SERVER_PORT??String(37877+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_SERVER_BETA_API_KEY:"",CLAUDE_MEM_SERVER_BETA_PROJECT_ID:"",CLAUDE_MEM_REDACTION_ENABLED:"true",CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES:"",CLAUDE_MEM_REDACTION_EMAIL_ALLOWLIST:"",CLAUDE_MEM_REDACTION_LOCALE_PATTERNS:"{}",CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES:"{}"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return process.env[e]??this.DEFAULTS[e]}static getInt(e){let t=this.get(e);return parseInt(t,10)}static getBool(e){let t=this.get(e);return t==="true"||t===!0}static applyEnvOverrides(e){let t={...e};for(let s of Object.keys(this.DEFAULTS))process.env[s]!==void 0&&(t[s]=process.env[s]);return t}static loadFromFile(e,t=!0){try{if(!(0,I.existsSync)(e)){let a=this.getAllDefaults();try{let d=(0,w.dirname)(e);(0,I.existsSync)(d)||(0,I.mkdirSync)(d,{recursive:!0}),(0,I.writeFileSync)(e,JSON.stringify(a,null,2),"utf-8"),console.warn("[SETTINGS] Created settings file with defaults:",e)}catch(d){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,d instanceof Error?d.message:String(d))}return t?this.applyEnvOverrides(a):a}let s=(0,I.readFileSync)(e,"utf-8"),n=JSON.parse(s.replace(/^\uFEFF/,"")),o=n;if(n.env&&typeof n.env=="object"){o=n.env;try{(0,I.writeFileSync)(e,JSON.stringify(o,null,2),"utf-8"),console.warn("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(a){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,a instanceof Error?a.message:String(a))}}let i={...this.DEFAULTS};for(let a of Object.keys(this.DEFAULTS))o[a]!==void 0&&(i[a]=o[a]);return t?this.applyEnvOverrides(i):i}catch(s){console.warn("[SETTINGS] Failed to load settings, using defaults:",e,s instanceof Error?s.message:String(s));let n=this.getAllDefaults();return t?this.applyEnvOverrides(n):n}}};function Ds(){return process.env.CLAUDE_MEM_DATA_DIR||fe.default.join(Je.default.homedir(),".claude-mem")}function Ve(r){return r.split(",").map(e=>e.trim()).filter(Boolean)}function qe(r,e){try{return JSON.parse(r)}catch{return e}}function ze(r,e){let t=r.toLowerCase(),[s,n]=t.split("@");if(s==="noreply"||s==="no-reply"||n==="example.com"||n==="example.org"||n==="example.net")return!0;for(let o of e){let i=o.toLowerCase();if(i.startsWith("@")&&n===i.slice(1)||i===n||i===t)return!0}return!1}function Ze(r){let e=U.loadFromFile(fe.default.join(Ds(),"settings.json")),t=c=>e[c]??"",s=t("CLAUDE_MEM_REDACTION_ENABLED")!=="false",n=new Set(Ve(t("CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES"))),o=Ve(t("CLAUDE_MEM_REDACTION_EMAIL_ALLOWLIST")),i=qe(t("CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES"),{}),a=r?i[r]:void 0;if(a){a.enabled===!1&&(s=!1);for(let c of a.disabledCategories??[])n.add(c);a.emailAllowlist&&(o=[...o,...a.emailAllowlist])}let d=qe(t("CLAUDE_MEM_REDACTION_LOCALE_PATTERNS"),{}),_=[];for(let[c,u]of Object.entries(d))try{_.push({category:"NATIONAL_ID",label:c,regex:new RegExp(u,"g")})}catch{}return{enabled:s,disabled:n,emailAllowlist:o,localePatterns:_}}function Y(r,e,t){return e.regex.lastIndex=0,r.replace(e.regex,(...s)=>{let n=s[0],o=e.replace?e.replace(...s):`[REDACTED:${e.label}]`;return o!==n&&(t[e.label]=(t[e.label]??0)+1),o})}function k(r,e={}){if(typeof r!="string"||r.length===0)return{text:typeof r=="string"?r:"",counts:{}};let t=Ze(e.project);if(!t.enabled)return{text:r,counts:{}};let s={},n=r;try{if(!t.disabled.has("OPERATOR"))for(let o of Ke())n=Y(n,o,s);for(let o of[...Be,...t.localePatterns])t.disabled.has(o.category)||(n=Y(n,o,s));t.disabled.has("EMAIL")||(ue.lastIndex=0,n=n.replace(ue,o=>ze(o,t.emailAllowlist)?o:(s.EMAIL=(s.EMAIL??0)+1,"[REDACTED:EMAIL]"))),t.disabled.has("PHONE")||(n=Y(n,{category:"PHONE",label:"PHONE",regex:je},s)),t.disabled.has("POSTAL")||(n=Y(n,{category:"POSTAL",label:"POSTAL_ADDRESS",regex:Xe},s))}catch{return{text:r,counts:{}}}return{text:n,counts:s}}function Qe(r,e,t){Object.values(t).reduce((n,o)=>n+o,0)>0&&l.info("REDACT","redaction applied",{surface:r,project:e,counts:t})}function et(r,e={}){let{text:t,counts:s}=k(r,{project:e.project});return Qe(e.surface??"persist",e.project,s),t}function F(r,e,t={}){let s={},n={...r},o={project:t.project};for(let i of e){let a=n[i];if(typeof a=="string"){let{text:d,counts:_}=k(a,o);n[i]=d;for(let[c,u]of Object.entries(_))s[c]=(s[c]??0)+u}else Array.isArray(a)&&(n[i]=a.map(d=>{if(typeof d!="string")return d;let{text:_,counts:c}=k(d,o);for(let[u,f]of Object.entries(c))s[u]=(s[u]??0)+f;return _}))}return Qe(t.surface??"persist",t.project,s),n}function Ms(r,e){return{customTitle:r,platformSource:e?v(e):void 0}}var V=class{db;constructor(e=Me){e instanceof Se.Database?this.db=e:(e!==":memory:"&&ve(O),this.db=new Se.Database(e),this.db.run("PRAGMA journal_mode = WAL"),this.db.run("PRAGMA synchronous = NORMAL"),this.db.run("PRAGMA foreign_keys = ON"),this.db.run("PRAGMA journal_size_limit = 4194304")),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.repairSessionIdColumnRename(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn(),this.addSessionPlatformSourceColumn(),this.addObservationModelColumns(),this.ensureMergedIntoProjectColumns(),this.addObservationSubagentColumns(),this.addObservationsUniqueContentHashIndex(),this.addObservationsMetadataColumn(),this.dropDeadPendingMessagesColumns(),this.ensurePendingMessagesToolUseIdColumn(),this.dropWorkerPidColumn()}dropWorkerPidColumn(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(32),s=this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="worker_pid");if(!(e&&!s)){if(s)try{this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid"),this.db.run("ALTER TABLE pending_messages DROP COLUMN worker_pid"),l.debug("DB","Dropped worker_pid column and its index from pending_messages")}catch(n){l.warn("DB","Failed to drop worker_pid column from pending_messages",{},n instanceof Error?n:new Error(String(n)));return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(32,new Date().toISOString())}}dropDeadPendingMessagesColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(31),t=this.db.query("PRAGMA table_info(pending_messages)").all(),s=new Set(t.map(i=>i.name)),o=["retry_count","failed_at_epoch","completed_at_epoch"].filter(i=>s.has(i));if(!(e&&o.length===0)){if(o.length>0){this.db.run("BEGIN TRANSACTION");try{this.db.run("DELETE FROM pending_messages WHERE status NOT IN ('pending', 'processing')");for(let i of o)this.db.run(`ALTER TABLE pending_messages DROP COLUMN ${i}`),l.debug("DB",`Dropped dead column ${i} from pending_messages`);e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString()),this.db.run("COMMIT")}catch(i){this.db.run("ROLLBACK"),l.warn("DB","Failed to drop dead columns from pending_messages",{},i instanceof Error?i:new Error(String(i)));return}return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString())}}initializeSchema(){this.db.run(`
      CREATE TABLE IF NOT EXISTS schema_versions (
        id INTEGER PRIMARY KEY,
        version INTEGER UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      )
    `),this.db.run(`
      CREATE TABLE IF NOT EXISTS sdk_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT UNIQUE NOT NULL,
        memory_session_id TEXT UNIQUE,
        project TEXT NOT NULL,
        platform_source TEXT NOT NULL DEFAULT 'claude',
        user_prompt TEXT,
        started_at TEXT NOT NULL,
        started_at_epoch INTEGER NOT NULL,
        completed_at TEXT,
        completed_at_epoch INTEGER,
        status TEXT CHECK(status IN ('active', 'completed', 'failed')) NOT NULL DEFAULT 'active'
      );

      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_claude_id ON sdk_sessions(content_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_sdk_id ON sdk_sessions(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_project ON sdk_sessions(project);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_status ON sdk_sessions(status);
      CREATE INDEX IF NOT EXISTS idx_sdk_sessions_started ON sdk_sessions(started_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS observations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT NOT NULL,
        type TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_observations_project ON observations(project);
      CREATE INDEX IF NOT EXISTS idx_observations_type ON observations(type);
      CREATE INDEX IF NOT EXISTS idx_observations_created ON observations(created_at_epoch DESC);

      CREATE TABLE IF NOT EXISTS session_summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT UNIQUE NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX IF NOT EXISTS idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(4,new Date().toISOString())}ensureWorkerPortColumn(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(s=>s.name==="worker_port")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN worker_port INTEGER"),l.debug("DB","Added worker_port column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(5,new Date().toISOString())}ensurePromptTrackingColumns(){this.db.query("PRAGMA table_info(sdk_sessions)").all().some(a=>a.name==="prompt_counter")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN prompt_counter INTEGER DEFAULT 0"),l.debug("DB","Added prompt_counter column to sdk_sessions table")),this.db.query("PRAGMA table_info(observations)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE observations ADD COLUMN prompt_number INTEGER"),l.debug("DB","Added prompt_number column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(a=>a.name==="prompt_number")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN prompt_number INTEGER"),l.debug("DB","Added prompt_number column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(6,new Date().toISOString())}removeSessionSummariesUniqueConstraint(){if(!this.db.query("PRAGMA index_list(session_summaries)").all().some(s=>s.unique===1&&s.origin!=="pk")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString());return}l.debug("DB","Removing UNIQUE constraint from session_summaries.memory_session_id"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS session_summaries_new"),this.db.run(`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, created_at, created_at_epoch
      FROM session_summaries
    `),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(7,new Date().toISOString()),l.debug("DB","Successfully removed UNIQUE constraint from session_summaries.memory_session_id")}addObservationHierarchicalFields(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(8))return;if(this.db.query("PRAGMA table_info(observations)").all().some(n=>n.name==="title")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString());return}l.debug("DB","Adding hierarchical fields to observations table"),this.db.run(`
      ALTER TABLE observations ADD COLUMN title TEXT;
      ALTER TABLE observations ADD COLUMN subtitle TEXT;
      ALTER TABLE observations ADD COLUMN facts TEXT;
      ALTER TABLE observations ADD COLUMN narrative TEXT;
      ALTER TABLE observations ADD COLUMN concepts TEXT;
      ALTER TABLE observations ADD COLUMN files_read TEXT;
      ALTER TABLE observations ADD COLUMN files_modified TEXT;
    `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(8,new Date().toISOString()),l.debug("DB","Successfully added hierarchical fields to observations table")}makeObservationsTextNullable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(9))return;let s=this.db.query("PRAGMA table_info(observations)").all().find(n=>n.name==="text");if(!s||s.notnull===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString());return}l.debug("DB","Making observations.text nullable"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TABLE IF EXISTS observations_new"),this.db.run(`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE
      )
    `),this.db.run(`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             created_at, created_at_epoch
      FROM observations
    `),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(9,new Date().toISOString()),l.debug("DB","Successfully made observations.text nullable")}createUserPromptsTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(10))return;if(this.db.query("PRAGMA table_info(user_prompts)").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString());return}l.debug("DB","Creating user_prompts table with FTS5 support"),this.db.run("BEGIN TRANSACTION"),this.db.run(`
      CREATE TABLE user_prompts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        content_session_id TEXT NOT NULL,
        prompt_number INTEGER NOT NULL,
        prompt_text TEXT NOT NULL,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(content_session_id) REFERENCES sdk_sessions(content_session_id) ON DELETE CASCADE
      );

      CREATE INDEX idx_user_prompts_claude_session ON user_prompts(content_session_id);
      CREATE INDEX idx_user_prompts_created ON user_prompts(created_at_epoch DESC);
      CREATE INDEX idx_user_prompts_prompt_number ON user_prompts(prompt_number);
      CREATE INDEX idx_user_prompts_lookup ON user_prompts(content_session_id, prompt_number);
    `);let s=`
      CREATE VIRTUAL TABLE user_prompts_fts USING fts5(
        prompt_text,
        content='user_prompts',
        content_rowid='id'
      );
    `,n=`
      CREATE TRIGGER user_prompts_ai AFTER INSERT ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;

      CREATE TRIGGER user_prompts_ad AFTER DELETE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
      END;

      CREATE TRIGGER user_prompts_au AFTER UPDATE ON user_prompts BEGIN
        INSERT INTO user_prompts_fts(user_prompts_fts, rowid, prompt_text)
        VALUES('delete', old.id, old.prompt_text);
        INSERT INTO user_prompts_fts(rowid, prompt_text)
        VALUES (new.id, new.prompt_text);
      END;
    `;try{this.db.run(s),this.db.run(n)}catch(o){o instanceof Error?l.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},o):l.warn("DB","FTS5 not available \u2014 user_prompts_fts skipped (search uses ChromaDB)",{},new Error(String(o))),this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),l.debug("DB","Created user_prompts table (without FTS5)");return}this.db.run("COMMIT"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(10,new Date().toISOString()),l.debug("DB","Successfully created user_prompts table")}ensureDiscoveryTokensColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(11))return;this.db.query("PRAGMA table_info(observations)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE observations ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),l.debug("DB","Added discovery_tokens column to observations table")),this.db.query("PRAGMA table_info(session_summaries)").all().some(i=>i.name==="discovery_tokens")||(this.db.run("ALTER TABLE session_summaries ADD COLUMN discovery_tokens INTEGER DEFAULT 0"),l.debug("DB","Added discovery_tokens column to session_summaries table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(11,new Date().toISOString())}createPendingMessagesTable(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(16))return;if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length>0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString());return}l.debug("DB","Creating pending_messages table"),this.db.run(`
      CREATE TABLE pending_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_db_id INTEGER NOT NULL,
        content_session_id TEXT NOT NULL,
        message_type TEXT NOT NULL CHECK(message_type IN ('observation', 'summarize')),
        tool_name TEXT,
        tool_input TEXT,
        tool_response TEXT,
        cwd TEXT,
        last_user_message TEXT,
        last_assistant_message TEXT,
        prompt_number INTEGER,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing')),
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY (session_db_id) REFERENCES sdk_sessions(id) ON DELETE CASCADE
      )
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),l.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;l.debug("DB","Checking session ID columns for semantic clarity rename");let t=0,s=(n,o,i)=>{let a=this.db.query(`PRAGMA table_info(${n})`).all(),d=a.some(c=>c.name===o);return a.some(c=>c.name===i)?!1:d?(this.db.run(`ALTER TABLE ${n} RENAME COLUMN ${o} TO ${i}`),l.debug("DB",`Renamed ${n}.${o} to ${i}`),!0):(l.warn("DB",`Column ${o} not found in ${n}, skipping rename`),!1)};s("sdk_sessions","claude_session_id","content_session_id")&&t++,s("sdk_sessions","sdk_session_id","memory_session_id")&&t++,s("pending_messages","claude_session_id","content_session_id")&&t++,s("observations","sdk_session_id","memory_session_id")&&t++,s("session_summaries","sdk_session_id","memory_session_id")&&t++,s("user_prompts","claude_session_id","content_session_id")&&t++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),t>0?l.debug("DB",`Successfully renamed ${t} session ID columns`):l.debug("DB","No session ID column renames needed (already up to date)")}repairSessionIdColumnRename(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(19)||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(19,new Date().toISOString())}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),l.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21))return;l.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new");let t=this.db.query("PRAGMA table_info(observations)").all(),s=t.some(T=>T.name==="metadata"),n=t.some(T=>T.name==="content_hash"),o=s?`,
        metadata TEXT`:"",i=s?", metadata":"",a=n?`,
        content_hash TEXT`:"",d=n?", content_hash":"",_=`
      CREATE TABLE observations_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        text TEXT,
        type TEXT NOT NULL,
        title TEXT,
        subtitle TEXT,
        facts TEXT,
        narrative TEXT,
        concepts TEXT,
        files_read TEXT,
        files_modified TEXT,
        prompt_number INTEGER,
        discovery_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL${o}${a},
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `,c=`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             discovery_tokens, created_at, created_at_epoch${i}${d}
      FROM observations
    `,u=`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `,f=`
      CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
        INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
      END;

      CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
      END;

      CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES('delete', old.id, old.title, old.subtitle, old.narrative, old.text, old.facts, old.concepts);
        INSERT INTO observations_fts(rowid, title, subtitle, narrative, text, facts, concepts)
        VALUES (new.id, new.title, new.subtitle, new.narrative, new.text, new.facts, new.concepts);
      END;
    `;this.db.run("DROP TRIGGER IF EXISTS session_summaries_ai"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_ad"),this.db.run("DROP TRIGGER IF EXISTS session_summaries_au"),this.db.run("DROP TABLE IF EXISTS session_summaries_new");let m=`
      CREATE TABLE session_summaries_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        memory_session_id TEXT NOT NULL,
        project TEXT NOT NULL,
        request TEXT,
        investigated TEXT,
        learned TEXT,
        completed TEXT,
        next_steps TEXT,
        files_read TEXT,
        files_edited TEXT,
        notes TEXT,
        prompt_number INTEGER,
        discovery_tokens INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        created_at_epoch INTEGER NOT NULL,
        FOREIGN KEY(memory_session_id) REFERENCES sdk_sessions(memory_session_id) ON DELETE CASCADE ON UPDATE CASCADE
      )
    `,A=`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, discovery_tokens, created_at, created_at_epoch
      FROM session_summaries
    `,R=`
      CREATE INDEX idx_session_summaries_sdk_session ON session_summaries(memory_session_id);
      CREATE INDEX idx_session_summaries_project ON session_summaries(project);
      CREATE INDEX idx_session_summaries_created ON session_summaries(created_at_epoch DESC);
    `,p=`
      CREATE TRIGGER IF NOT EXISTS session_summaries_ai AFTER INSERT ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
      END;

      CREATE TRIGGER IF NOT EXISTS session_summaries_ad AFTER DELETE ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
      END;

      CREATE TRIGGER IF NOT EXISTS session_summaries_au AFTER UPDATE ON session_summaries BEGIN
        INSERT INTO session_summaries_fts(session_summaries_fts, rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES('delete', old.id, old.request, old.investigated, old.learned, old.completed, old.next_steps, old.notes);
        INSERT INTO session_summaries_fts(rowid, request, investigated, learned, completed, next_steps, notes)
        VALUES (new.id, new.request, new.investigated, new.learned, new.completed, new.next_steps, new.notes);
      END;
    `;try{this.recreateObservationsWithCascade(_,c,u,f),this.recreateSessionSummariesWithCascade(m,A,R,p),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),l.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(T){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),T instanceof Error?T:new Error(String(T))}}recreateObservationsWithCascade(e,t,s,n){this.db.run(e),this.db.run(t),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(s),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(n)}recreateSessionSummariesWithCascade(e,t,s,n){this.db.run(e),this.db.run(t),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(s),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(n)}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),l.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(n=>n.name==="custom_title")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),l.debug("DB","Added custom_title column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString())}addSessionPlatformSourceColumn(){let t=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(i=>i.name==="platform_source"),n=this.db.query("PRAGMA index_list(sdk_sessions)").all().some(i=>i.name==="idx_sdk_sessions_platform_source");this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(24)&&t&&n||(t||(this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${h}'`),l.debug("DB","Added platform_source column to sdk_sessions table")),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${h}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),n||this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()))}addObservationModelColumns(){let e=this.db.query("PRAGMA table_info(observations)").all(),t=e.some(n=>n.name==="generated_by_model"),s=e.some(n=>n.name==="relevance_count");t&&s||(t||this.db.run("ALTER TABLE observations ADD COLUMN generated_by_model TEXT"),s||this.db.run("ALTER TABLE observations ADD COLUMN relevance_count INTEGER DEFAULT 0"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(26,new Date().toISOString()))}ensureMergedIntoProjectColumns(){this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="merged_into_project")||this.db.run("ALTER TABLE observations ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project)"),this.db.query("PRAGMA table_info(session_summaries)").all().some(s=>s.name==="merged_into_project")||this.db.run("ALTER TABLE session_summaries ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project)")}addObservationSubagentColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27),t=this.db.query("PRAGMA table_info(observations)").all(),s=t.some(i=>i.name==="agent_type"),n=t.some(i=>i.name==="agent_id");s||this.db.run("ALTER TABLE observations ADD COLUMN agent_type TEXT"),n||this.db.run("ALTER TABLE observations ADD COLUMN agent_id TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id)");let o=this.db.query("PRAGMA table_info(pending_messages)").all();if(o.length>0){let i=o.some(d=>d.name==="agent_type"),a=o.some(d=>d.name==="agent_id");i||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_type TEXT"),a||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_id TEXT")}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString())}ensurePendingMessagesToolUseIdColumn(){if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString());return}this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="tool_use_id")||this.db.run("ALTER TABLE pending_messages ADD COLUMN tool_use_id TEXT"),this.db.run("BEGIN TRANSACTION");try{this.db.run(`
        DELETE FROM pending_messages
         WHERE id IN (
           SELECT id
             FROM (
               SELECT id,
                      ROW_NUMBER() OVER (
                        PARTITION BY content_session_id, tool_use_id
                        ORDER BY CASE status
                          WHEN 'processing' THEN 0
                          WHEN 'pending' THEN 1
                          ELSE 2
                        END, id
                      ) AS duplicate_rank
                 FROM pending_messages
                WHERE tool_use_id IS NOT NULL
             )
            WHERE duplicate_rank > 1
           )
      `),this.db.run(`
        -- tool_use_id is optional for summaries and legacy rows; enforce de-dupe
        -- only for rows that came from a concrete tool-use event.
        CREATE UNIQUE INDEX IF NOT EXISTS ux_pending_session_tool
        ON pending_messages(content_session_id, tool_use_id)
        WHERE tool_use_id IS NOT NULL
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString()),this.db.run("COMMIT")}catch(n){throw this.db.run("ROLLBACK"),n}}addObservationsUniqueContentHashIndex(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(29))return;let t=this.db.query("PRAGMA table_info(observations)").all(),s=t.some(o=>o.name==="memory_session_id"),n=t.some(o=>o.name==="content_hash");if(!s||!n){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString());return}this.db.run("BEGIN TRANSACTION");try{this.db.run(`
        UPDATE observations
           SET content_hash = '__null_migration_' || id || '__'
         WHERE content_hash IS NULL
      `),this.db.run(`
        DELETE FROM observations
         WHERE id IN (
           SELECT id
             FROM (
               SELECT id,
                      ROW_NUMBER() OVER (
                        PARTITION BY memory_session_id, content_hash
                        ORDER BY id
                      ) AS duplicate_rank
                 FROM observations
             )
            WHERE duplicate_rank > 1
         )
      `),this.db.run(`
        CREATE UNIQUE INDEX IF NOT EXISTS ux_observations_session_hash
        ON observations(memory_session_id, content_hash)
      `),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(29,new Date().toISOString()),this.db.run("COMMIT")}catch(o){throw this.db.run("ROLLBACK"),o}}addObservationsMetadataColumn(){this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="metadata")||(this.db.run("ALTER TABLE observations ADD COLUMN metadata TEXT"),l.debug("DB","Added metadata column to observations table (#2116)")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(30,new Date().toISOString())}updateMemorySessionId(e,t){this.db.prepare(`
      UPDATE sdk_sessions
      SET memory_session_id = ?
      WHERE id = ?
    `).run(t,e)}markSessionCompleted(e){let t=Date.now(),s=new Date(t).toISOString();this.db.prepare(`
      UPDATE sdk_sessions
      SET status = 'completed', completed_at = ?, completed_at_epoch = ?
      WHERE id = ?
    `).run(s,t,e)}ensureMemorySessionIdRegistered(e,t,s){let n=this.db.prepare(`
      SELECT id, memory_session_id, worker_port FROM sdk_sessions WHERE id = ?
    `).get(e);if(!n)throw new Error(`Session ${e} not found in sdk_sessions`);n.memory_session_id!==t&&(this.db.prepare(`
        UPDATE sdk_sessions SET memory_session_id = ? WHERE id = ?
      `).run(t,e),l.info("DB","Registered memory_session_id before storage (FK fix)",{sessionDbId:e,oldId:n.memory_session_id,newId:t})),typeof s=="number"&&n.worker_port!==s&&this.db.prepare(`
        UPDATE sdk_sessions SET worker_port = ? WHERE id = ?
      `).run(s,e)}getRecentSummaries(e,t=10){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at
      FROM session_summaries
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getRecentSummariesWithSessionInfo(e,t=3){return this.db.prepare(`
      SELECT
        memory_session_id, request, learned, completed, next_steps,
        prompt_number, created_at
      FROM session_summaries
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getRecentObservations(e,t=20){return this.db.prepare(`
      SELECT type, text, prompt_number, created_at
      FROM observations
      WHERE project = ?
      ORDER BY created_at_epoch DESC
      LIMIT ?
    `).all(e,t)}getAllRecentObservations(e=100){return this.db.prepare(`
      SELECT
        o.id,
        o.type,
        o.title,
        o.subtitle,
        o.text,
        o.project,
        COALESCE(s.platform_source, '${h}') as platform_source,
        o.prompt_number,
        o.created_at,
        o.created_at_epoch
      FROM observations o
      LEFT JOIN sdk_sessions s ON o.memory_session_id = s.memory_session_id
      ORDER BY o.created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllRecentSummaries(e=50){return this.db.prepare(`
      SELECT
        ss.id,
        ss.request,
        ss.investigated,
        ss.learned,
        ss.completed,
        ss.next_steps,
        ss.files_read,
        ss.files_edited,
        ss.notes,
        ss.project,
        COALESCE(s.platform_source, '${h}') as platform_source,
        ss.prompt_number,
        ss.created_at,
        ss.created_at_epoch
      FROM session_summaries ss
      LEFT JOIN sdk_sessions s ON ss.memory_session_id = s.memory_session_id
      ORDER BY ss.created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllRecentUserPrompts(e=100){return this.db.prepare(`
      SELECT
        up.id,
        up.content_session_id,
        s.project,
        COALESCE(s.platform_source, '${h}') as platform_source,
        up.prompt_number,
        up.prompt_text,
        up.created_at,
        up.created_at_epoch
      FROM user_prompts up
      LEFT JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      ORDER BY up.created_at_epoch DESC
      LIMIT ?
    `).all(e)}getAllProjects(e){let t=e?v(e):void 0,s=`
      SELECT DISTINCT project
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
    `,n=[_e];return t&&(s+=" AND COALESCE(platform_source, ?) = ?",n.push(h,t)),s+=" ORDER BY project ASC",this.db.prepare(s).all(...n).map(i=>i.project)}getProjectCatalog(){let e=this.db.prepare(`
      SELECT
        COALESCE(platform_source, '${h}') as platform_source,
        project,
        MAX(started_at_epoch) as latest_epoch
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
      GROUP BY COALESCE(platform_source, '${h}'), project
      ORDER BY latest_epoch DESC
    `).all(_e),t=[],s=new Set,n={};for(let i of e){let a=v(i.platform_source);n[a]||(n[a]=[]),n[a].includes(i.project)||n[a].push(i.project),s.has(i.project)||(s.add(i.project),t.push(i.project))}let o=Pe(Object.keys(n));return{projects:t,sources:o,projectsBySource:Object.fromEntries(o.map(i=>[i,n[i]||[]]))}}getLatestUserPrompt(e){return this.db.prepare(`
      SELECT
        up.*,
        s.memory_session_id,
        s.project,
        COALESCE(s.platform_source, '${h}') as platform_source
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.content_session_id = ?
      ORDER BY up.created_at_epoch DESC
      LIMIT 1
    `).get(e)}findRecentDuplicateUserPrompt(e,t,s){return we(this.db,e,W(t),s)}getRecentSessionsWithStatus(e,t=3){return this.db.prepare(`
      SELECT * FROM (
        SELECT
          s.memory_session_id,
          s.status,
          s.started_at,
          s.started_at_epoch,
          s.user_prompt,
          CASE WHEN sum.memory_session_id IS NOT NULL THEN 1 ELSE 0 END as has_summary
        FROM sdk_sessions s
        LEFT JOIN session_summaries sum ON s.memory_session_id = sum.memory_session_id
        WHERE s.project = ? AND s.memory_session_id IS NOT NULL
        GROUP BY s.memory_session_id
        ORDER BY s.started_at_epoch DESC
        LIMIT ?
      )
      ORDER BY started_at_epoch ASC
    `).all(e,t)}getObservationsForSession(e){return this.db.prepare(`
      SELECT title, subtitle, type, prompt_number
      FROM observations
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch ASC
    `).all(e)}getObservationById(e){return this.db.prepare(`
      SELECT *
      FROM observations
      WHERE id = ?
    `).get(e)||null}getObservationsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o,type:i,concepts:a,files:d}=t,_=s==="relevance",c=_?"":`ORDER BY created_at_epoch ${s==="date_asc"?"ASC":"DESC"}`,u=n?`LIMIT ${n}`:"",f=e.map(()=>"?").join(","),m=[...e],A=[];if(o&&(A.push("project = ?"),m.push(o)),i)if(Array.isArray(i)){let S=i.map(()=>"?").join(",");A.push(`type IN (${S})`),m.push(...i)}else A.push("type = ?"),m.push(i);if(a){let S=Array.isArray(a)?a:[a],D=S.map(()=>"EXISTS (SELECT 1 FROM json_each(concepts) WHERE value = ?)");m.push(...S),A.push(`(${D.join(" OR ")})`)}if(d){let S=Array.isArray(d)?d:[d],D=S.map(()=>"(EXISTS (SELECT 1 FROM json_each(files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(files_modified) WHERE value LIKE ?))");S.forEach(Ie=>{m.push(`%${Ie}%`,`%${Ie}%`)}),A.push(`(${D.join(" OR ")})`)}let R=A.length>0?`WHERE id IN (${f}) AND ${A.join(" AND ")}`:`WHERE id IN (${f})`,T=this.db.prepare(`
      SELECT *
      FROM observations
      ${R}
      ${c}
      ${u}
    `).all(...m);if(!_)return T;let b=new Map(T.map(S=>[S.id,S]));return e.map(S=>b.get(S)).filter(S=>!!S)}getSummaryForSession(e){return this.db.prepare(`
      SELECT
        request, investigated, learned, completed, next_steps,
        files_read, files_edited, notes, prompt_number, created_at,
        created_at_epoch
      FROM session_summaries
      WHERE memory_session_id = ?
      ORDER BY created_at_epoch DESC
      LIMIT 1
    `).get(e)||null}getFilesForSession(e){let s=this.db.prepare(`
      SELECT files_read, files_modified
      FROM observations
      WHERE memory_session_id = ?
    `).all(e),n=new Set,o=new Set;for(let i of s)Ee(i.files_read).forEach(a=>n.add(a)),Ee(i.files_modified).forEach(a=>o.add(a));return{filesRead:Array.from(n),filesModified:Array.from(o)}}getSessionById(e){return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project,
             COALESCE(platform_source, '${h}') as platform_source,
             user_prompt, custom_title, status
      FROM sdk_sessions
      WHERE id = ?
      LIMIT 1
    `).get(e)||null}getSdkSessionsBySessionIds(e){if(e.length===0)return[];let t=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT id, content_session_id, memory_session_id, project,
             COALESCE(platform_source, '${h}') as platform_source,
             user_prompt, custom_title,
             started_at, started_at_epoch, completed_at, completed_at_epoch, status
      FROM sdk_sessions
      WHERE memory_session_id IN (${t})
      ORDER BY started_at_epoch DESC
    `).all(...e)}getPromptNumberFromUserPrompts(e){return this.db.prepare(`
      SELECT COUNT(*) as count FROM user_prompts WHERE content_session_id = ?
    `).get(e).count}createSDKSession(e,t,s,n,o){let i=new Date,a=i.getTime(),d=Ms(n,o),_=d.platformSource??h,c=W(s),u=this.db.prepare(`
      SELECT id, platform_source FROM sdk_sessions WHERE content_session_id = ?
    `).get(e);if(u){if(t&&this.db.prepare(`
          UPDATE sdk_sessions SET project = ?
          WHERE content_session_id = ? AND (project IS NULL OR project = '')
        `).run(t,e),d.customTitle&&this.db.prepare(`
          UPDATE sdk_sessions SET custom_title = ?
          WHERE content_session_id = ? AND custom_title IS NULL
        `).run(d.customTitle,e),d.platformSource){let m=u.platform_source?.trim()?v(u.platform_source):void 0;if(!m)this.db.prepare(`
            UPDATE sdk_sessions SET platform_source = ?
            WHERE content_session_id = ?
              AND COALESCE(platform_source, '') = ''
          `).run(d.platformSource,e);else if(m!==d.platformSource)throw new Error(`Platform source conflict for session ${e}: existing=${m}, received=${d.platformSource}`)}return u.id}return this.db.prepare(`
      INSERT INTO sdk_sessions
      (content_session_id, memory_session_id, project, platform_source, user_prompt, custom_title, started_at, started_at_epoch, status)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'active')
    `).run(e,t,_,c,d.customTitle||null,i.toISOString(),a),this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e).id}saveUserPrompt(e,t,s){let n=new Date,o=n.getTime(),i=et(W(s),{surface:"sqlite"});return this.db.prepare(`
      INSERT INTO user_prompts
      (content_session_id, prompt_number, prompt_text, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?)
    `).run(e,t,i,n.toISOString(),o).lastInsertRowid}getUserPrompt(e,t){return this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,t)?.prompt_text??null}storeObservation(e,t,s,n,o=0,i,a){let d=i??Date.now(),_=new Date(d).toISOString(),c=F(s,["title","subtitle","narrative","facts","concepts"],{project:t,surface:"sqlite"}),u=ce(e,c.title,c.narrative),m=this.db.prepare(`
      INSERT INTO observations
      (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
       files_read, files_modified, prompt_number, discovery_tokens, agent_type, agent_id, content_hash, created_at, created_at_epoch,
       generated_by_model, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(memory_session_id, content_hash) DO NOTHING
      RETURNING id, created_at_epoch
    `).get(e,t,c.type,c.title,c.subtitle,JSON.stringify(c.facts),c.narrative,JSON.stringify(c.concepts),JSON.stringify(c.files_read),JSON.stringify(c.files_modified),n||null,o,s.agent_type??null,s.agent_id??null,u,_,d,a||null,s.metadata??null);if(m)return{id:m.id,createdAtEpoch:m.created_at_epoch};let A=this.db.prepare("SELECT id, created_at_epoch FROM observations WHERE memory_session_id = ? AND content_hash = ?").get(e,u);if(!A)throw new Error(`storeObservation: ON CONFLICT without existing row for content_hash=${u}`);return{id:A.id,createdAtEpoch:A.created_at_epoch}}storeSummary(e,t,s,n,o=0,i){let a=i??Date.now(),d=new Date(a).toISOString(),_=F(s,["request","investigated","learned","completed","next_steps","notes"],{project:t,surface:"sqlite"}),u=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,_.request,_.investigated,_.learned,_.completed,_.next_steps,_.notes,n||null,o,d,a);return{id:Number(u.lastInsertRowid),createdAtEpoch:a}}storeObservations(e,t,s,n,o,i=0,a,d){let _=a??Date.now(),c=new Date(_).toISOString();return this.db.transaction(()=>{let f=[],m=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, agent_type, agent_id, content_hash, created_at, created_at_epoch,
         generated_by_model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(memory_session_id, content_hash) DO NOTHING
        RETURNING id
      `),A=this.db.prepare("SELECT id FROM observations WHERE memory_session_id = ? AND content_hash = ?");for(let p of s){let T=F(p,["title","subtitle","narrative","facts","concepts"],{project:t,surface:"sqlite"}),b=ce(e,T.title,T.narrative),S=m.get(e,t,T.type,T.title,T.subtitle,JSON.stringify(T.facts),T.narrative,JSON.stringify(T.concepts),JSON.stringify(T.files_read),JSON.stringify(T.files_modified),o||null,i,T.agent_type??null,T.agent_id??null,b,c,_,d||null);if(S){f.push(S.id);continue}let D=A.get(e,b);if(!D)throw new Error(`storeObservations: ON CONFLICT without existing row for content_hash=${b}`);f.push(D.id)}let R=null;if(n){let p=F(n,["request","investigated","learned","completed","next_steps","notes"],{project:t,surface:"sqlite"}),b=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,p.request,p.investigated,p.learned,p.completed,p.next_steps,p.notes,o||null,i,c,_);R=Number(b.lastInsertRowid)}return{observationIds:f,summaryId:R,createdAtEpoch:_}})()}getSessionSummariesByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="relevance",a=i?"":`ORDER BY created_at_epoch ${s==="date_asc"?"ASC":"DESC"}`,d=n?`LIMIT ${n}`:"",_=e.map(()=>"?").join(","),c=[...e],u=o?`WHERE id IN (${_}) AND project = ?`:`WHERE id IN (${_})`;o&&c.push(o);let m=this.db.prepare(`
      SELECT * FROM session_summaries
      ${u}
      ${a}
      ${d}
    `).all(...c);if(!i)return m;let A=new Map(m.map(R=>[R.id,R]));return e.map(R=>A.get(R)).filter(R=>!!R)}getUserPromptsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="relevance",a=i?"":`ORDER BY up.created_at_epoch ${s==="date_asc"?"ASC":"DESC"}`,d=n?`LIMIT ${n}`:"",_=e.map(()=>"?").join(","),c=[...e],u=o?"AND s.project = ?":"";o&&c.push(o);let m=this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.id IN (${_}) ${u}
      ${a}
      ${d}
    `).all(...c);if(!i)return m;let A=new Map(m.map(R=>[R.id,R]));return e.map(R=>A.get(R)).filter(R=>!!R)}getTimelineAroundTimestamp(e,t=10,s=10,n){return this.getTimelineAroundObservation(null,e,t,s,n)}getTimelineAroundObservation(e,t,s=10,n=10,o){let i=o?"AND project = ?":"",a=o?[o]:[],d,_;if(e!==null){let p=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id <= ? ${i}
        ORDER BY id DESC
        LIMIT ?
      `,T=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id >= ? ${i}
        ORDER BY id ASC
        LIMIT ?
      `;try{let b=this.db.prepare(p).all(e,...a,s+1),S=this.db.prepare(T).all(e,...a,n+1);if(b.length===0&&S.length===0)return{observations:[],sessions:[],prompts:[]};d=b.length>0?b[b.length-1].created_at_epoch:t,_=S.length>0?S[S.length-1].created_at_epoch:t}catch(b){return b instanceof Error?l.error("DB","Error getting boundary observations",{project:o},b):l.error("DB","Error getting boundary observations with non-Error",{},new Error(String(b))),{observations:[],sessions:[],prompts:[]}}}else{let p=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch <= ? ${i}
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `,T=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch >= ? ${i}
        ORDER BY created_at_epoch ASC
        LIMIT ?
      `;try{let b=this.db.prepare(p).all(t,...a,s),S=this.db.prepare(T).all(t,...a,n+1);if(b.length===0&&S.length===0)return{observations:[],sessions:[],prompts:[]};d=b.length>0?b[b.length-1].created_at_epoch:t,_=S.length>0?S[S.length-1].created_at_epoch:t}catch(b){return b instanceof Error?l.error("DB","Error getting boundary timestamps",{project:o},b):l.error("DB","Error getting boundary timestamps with non-Error",{},new Error(String(b))),{observations:[],sessions:[],prompts:[]}}}let c=`
      SELECT *
      FROM observations
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,u=`
      SELECT *
      FROM session_summaries
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,f=`
      SELECT up.*, s.project, s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${i.replace("project","s.project")}
      ORDER BY up.created_at_epoch ASC
    `,m=this.db.prepare(c).all(d,_,...a),A=this.db.prepare(u).all(d,_,...a),R=this.db.prepare(f).all(d,_,...a);return{observations:m,sessions:A.map(p=>({id:p.id,memory_session_id:p.memory_session_id,project:p.project,request:p.request,completed:p.completed,next_steps:p.next_steps,created_at:p.created_at,created_at_epoch:p.created_at_epoch})),prompts:R.map(p=>({id:p.id,content_session_id:p.content_session_id,prompt_number:p.prompt_number,prompt_text:p.prompt_text,project:p.project,created_at:p.created_at,created_at_epoch:p.created_at_epoch}))}}getPromptById(e){return this.db.prepare(`
      SELECT
        p.id,
        p.content_session_id,
        p.prompt_number,
        p.prompt_text,
        s.project,
        p.created_at,
        p.created_at_epoch
      FROM user_prompts p
      LEFT JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
      WHERE p.id = ?
      LIMIT 1
    `).get(e)||null}getPromptsByIds(e){if(e.length===0)return[];let t=e.map(()=>"?").join(",");return this.db.prepare(`
      SELECT
        p.id,
        p.content_session_id,
        p.prompt_number,
        p.prompt_text,
        s.project,
        p.created_at,
        p.created_at_epoch
      FROM user_prompts p
      LEFT JOIN sdk_sessions s ON p.content_session_id = s.content_session_id
      WHERE p.id IN (${t})
      ORDER BY p.created_at_epoch DESC
    `).all(...e)}getOrCreateManualSession(e){let t=`manual-${e}`,s=`manual-content-${e}`;if(this.db.prepare("SELECT memory_session_id FROM sdk_sessions WHERE memory_session_id = ?").get(t))return t;let o=new Date;return this.db.prepare(`
      INSERT INTO sdk_sessions (memory_session_id, content_session_id, project, platform_source, started_at, started_at_epoch, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(t,s,e,h,o.toISOString(),o.getTime()),l.info("SESSION","Created manual session",{memorySessionId:t,project:e}),t}close(){this.db.close()}importSdkSession(e){let t=this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e.content_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO sdk_sessions (
        content_session_id, memory_session_id, project, platform_source, user_prompt,
        started_at, started_at_epoch, completed_at, completed_at_epoch, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.memory_session_id,e.project,v(e.platform_source),e.user_prompt,e.started_at,e.started_at_epoch,e.completed_at,e.completed_at_epoch,e.status).lastInsertRowid}}importSessionSummary(e){let t=this.db.prepare("SELECT id FROM session_summaries WHERE memory_session_id = ?").get(e.memory_session_id);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO session_summaries (
        memory_session_id, project, request, investigated, learned,
        completed, next_steps, files_read, files_edited, notes,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.request,e.investigated,e.learned,e.completed,e.next_steps,e.files_read,e.files_edited,e.notes,e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importObservation(e){let t=this.db.prepare(`
      SELECT id FROM observations
      WHERE memory_session_id = ? AND title = ? AND created_at_epoch = ?
    `).get(e.memory_session_id,e.title,e.created_at_epoch);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, subtitle,
        facts, narrative, concepts, files_read, files_modified,
        prompt_number, discovery_tokens, agent_type, agent_id,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e.memory_session_id,e.project,e.text,e.type,e.title,e.subtitle,e.facts,e.narrative,e.concepts,e.files_read,e.files_modified,e.prompt_number,e.discovery_tokens||0,e.agent_type??null,e.agent_id??null,e.created_at,e.created_at_epoch).lastInsertRowid}}rebuildObservationsFTSIndex(){this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run("INSERT INTO observations_fts(observations_fts) VALUES('rebuild')")}importUserPrompt(e){let t=this.db.prepare(`
      SELECT id FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
    `).get(e.content_session_id,e.prompt_number);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO user_prompts (
        content_session_id, prompt_number, prompt_text,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.prompt_number,e.prompt_text,e.created_at,e.created_at_epoch).lastInsertRowid}}};var st=require("os"),rt=L(require("path"),1),nt=require("child_process");var J=require("fs"),q=L(require("path"),1);var $={isWorktree:!1,worktreeName:null,parentRepoPath:null,parentProjectName:null};function tt(r){let e=q.default.join(r,".git"),t;try{t=(0,J.statSync)(e)}catch(c){return c instanceof Error&&c.code!=="ENOENT"&&l.warn("GIT","Unexpected error checking .git",{error:c instanceof Error?c.message:String(c)}),$}if(!t.isFile())return $;let s;try{s=(0,J.readFileSync)(e,"utf-8").trim()}catch(c){return l.warn("GIT","Failed to read .git file",{error:c instanceof Error?c.message:String(c)}),$}let n=s.match(/^gitdir:\s*(.+)$/);if(!n)return $;let i=n[1].match(/^(.+)[/\\]\.git[/\\]worktrees[/\\]([^/\\]+)$/);if(!i)return $;let a=i[1],d=q.default.basename(r),_=q.default.basename(a);return{isWorktree:!0,worktreeName:d,parentRepoPath:a,parentProjectName:_}}function ot(r){return r==="~"||r.startsWith("~/")?r.replace(/^~/,(0,st.homedir)()):r}function ys(r){try{return(0,nt.execFileSync)("git",["rev-parse","--show-toplevel"],{cwd:r,encoding:"utf-8",stdio:["ignore","pipe","ignore"]}).trim()||null}catch{return null}}function vs(r){if(!r||r.trim()==="")return l.warn("PROJECT_NAME","Empty cwd provided, using fallback",{cwd:r}),"unknown-project";let e=ot(r),s=ys(e)??e,n=rt.default.basename(s);if(n===""){if(process.platform==="win32"){let i=r.match(/^([A-Z]):\\/i);if(i){let d=`drive-${i[1].toUpperCase()}`;return l.info("PROJECT_NAME","Drive root detected",{cwd:r,projectName:d}),d}}return l.warn("PROJECT_NAME","Root directory detected, using fallback",{cwd:r}),"unknown-project"}return n}function it(r){let e=vs(r);if(!r)return{primary:e,parent:null,isWorktree:!1,allProjects:[e]};let t=ot(r),s=tt(t);if(s.isWorktree&&s.parentProjectName){let n=`${s.parentProjectName}/${e}`;return{primary:n,parent:s.parentProjectName,isWorktree:!0,allProjects:[s.parentProjectName,n]}}return{primary:e,parent:null,isWorktree:!1,allProjects:[e]}}var H=require("fs"),z=require("path");var C=class r{static instance=null;activeMode=null;modesDir;constructor(){let e=Ue(),t=[...process.env.CLAUDE_MEM_MODES_DIR?[process.env.CLAUDE_MEM_MODES_DIR]:[],(0,z.join)(e,"modes"),(0,z.join)(e,"..","plugin","modes")],s=t.find(n=>(0,H.existsSync)(n));this.modesDir=s||t[0]}static getInstance(){return r.instance||(r.instance=new r),r.instance}parseInheritance(e){let t=e.split("--");if(t.length===1)return{hasParent:!1,parentId:"",overrideId:""};if(t.length>2)throw new Error(`Invalid mode inheritance: ${e}. Only one level of inheritance supported (parent--override)`);return{hasParent:!0,parentId:t[0],overrideId:e}}isPlainObject(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}deepMerge(e,t){let s={...e};for(let n in t){let o=t[n],i=e[n];this.isPlainObject(o)&&this.isPlainObject(i)?s[n]=this.deepMerge(i,o):s[n]=o}return s}loadModeFile(e){let t=(0,z.join)(this.modesDir,`${e}.json`);if(!(0,H.existsSync)(t))throw new Error(`Mode file not found: ${t}`);let s=(0,H.readFileSync)(t,"utf-8");return JSON.parse(s)}loadMode(e){let t=this.parseInheritance(e);if(!t.hasParent)try{let d=this.loadModeFile(e);return this.activeMode=d,l.debug("SYSTEM",`Loaded mode: ${d.name} (${e})`,void 0,{types:d.observation_types.map(_=>_.id),concepts:d.observation_concepts.map(_=>_.id)}),d}catch(d){if(d instanceof Error?l.warn("WORKER",`Mode file not found: ${e}, falling back to 'code'`,{message:d.message}):l.warn("WORKER",`Mode file not found: ${e}, falling back to 'code'`,{error:String(d)}),e==="code")throw new Error("Critical: code.json mode file missing");return this.loadMode("code")}let{parentId:s,overrideId:n}=t,o;try{o=this.loadMode(s)}catch(d){d instanceof Error?l.warn("WORKER",`Parent mode '${s}' not found for ${e}, falling back to 'code'`,{message:d.message}):l.warn("WORKER",`Parent mode '${s}' not found for ${e}, falling back to 'code'`,{error:String(d)}),o=this.loadMode("code")}let i;try{i=this.loadModeFile(n),l.debug("SYSTEM",`Loaded override file: ${n} for parent ${s}`)}catch(d){return d instanceof Error?l.warn("WORKER",`Override file '${n}' not found, using parent mode '${s}' only`,{message:d.message}):l.warn("WORKER",`Override file '${n}' not found, using parent mode '${s}' only`,{error:String(d)}),this.activeMode=o,o}if(!i)return l.warn("SYSTEM",`Invalid override file: ${n}, using parent mode '${s}' only`),this.activeMode=o,o;let a=this.deepMerge(o,i);return this.activeMode=a,l.debug("SYSTEM",`Loaded mode with inheritance: ${a.name} (${e} = ${s} + ${n})`,void 0,{parent:s,override:n,types:a.observation_types.map(d=>d.id),concepts:a.observation_concepts.map(d=>d.id)}),a}getActiveMode(){if(!this.activeMode)throw new Error("No mode loaded. Call loadMode() first.");return this.activeMode}getObservationTypes(){return this.getActiveMode().observation_types}getTypeIcon(e){return this.getObservationTypes().find(s=>s.id===e)?.emoji||"\u{1F4DD}"}getWorkEmoji(e){return this.getObservationTypes().find(s=>s.id===e)?.work_emoji||"\u{1F4DD}"}};function at(){let r=P.settings(),e=U.loadFromFile(r),t=C.getInstance().getActiveMode(),s=new Set(t.observation_types.map(o=>o.id)),n=new Set(t.observation_concepts.map(o=>o.id));return{totalObservationCount:parseInt(e.CLAUDE_MEM_CONTEXT_OBSERVATIONS,10),fullObservationCount:parseInt(e.CLAUDE_MEM_CONTEXT_FULL_COUNT,10),sessionCount:parseInt(e.CLAUDE_MEM_CONTEXT_SESSION_COUNT,10),showReadTokens:e.CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS==="true",showWorkTokens:e.CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS==="true",showSavingsAmount:e.CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT==="true",showSavingsPercent:e.CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT==="true",observationTypes:s,observationConcepts:n,fullObservationField:e.CLAUDE_MEM_CONTEXT_FULL_FIELD,showLastSummary:e.CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY==="true",showLastMessage:e.CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE==="true"}}var E={reset:"\x1B[0m",bright:"\x1B[1m",dim:"\x1B[2m",cyan:"\x1B[36m",green:"\x1B[32m",yellow:"\x1B[33m",blue:"\x1B[34m",magenta:"\x1B[35m",gray:"\x1B[90m",red:"\x1B[31m"},dt=4,Ae=1;function _t(r){let e=(r.title?.length||0)+(r.subtitle?.length||0)+(r.narrative?.length||0)+JSON.stringify(r.facts||[]).length;return Math.ceil(e/dt)}function be(r){let e=r.length,t=r.reduce((i,a)=>i+_t(a),0),s=r.reduce((i,a)=>i+(a.discovery_tokens||0),0),n=s-t,o=s>0?Math.round(n/s*100):0;return{totalObservations:e,totalReadTokens:t,totalDiscoveryTokens:s,savings:n,savingsPercent:o}}function Us(r){return C.getInstance().getWorkEmoji(r)}function G(r,e){let t=_t(r),s=r.discovery_tokens||0,n=Us(r.type),o=s>0?`${n} ${s.toLocaleString()}`:"-";return{readTokens:t,discoveryTokens:s,discoveryDisplay:o,workEmoji:n}}function x(r){return r.showReadTokens||r.showWorkTokens||r.showSavingsAmount||r.showSavingsPercent}var ct=L(require("path"),1),Z=require("fs");function Et(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      o.id,
      o.memory_session_id,
      COALESCE(s.platform_source, 'claude') as platform_source,
      o.type,
      o.title,
      o.subtitle,
      o.narrative,
      o.facts,
      o.concepts,
      o.files_read,
      o.files_modified,
      o.discovery_tokens,
      o.created_at,
      o.created_at_epoch
    FROM observations o
    LEFT JOIN sdk_sessions s ON o.memory_session_id = s.memory_session_id
    WHERE (o.project = ? OR o.merged_into_project = ?)
      AND type IN (${n})
      AND EXISTS (
        SELECT 1 FROM json_each(o.concepts)
        WHERE value IN (${i})
      )
    ORDER BY o.created_at_epoch DESC
    LIMIT ?
  `).all(e,e,...s,...o,t.totalObservationCount)}function lt(r,e,t){return r.db.prepare(`
    SELECT
      ss.id,
      ss.memory_session_id,
      COALESCE(s.platform_source, 'claude') as platform_source,
      ss.request,
      ss.investigated,
      ss.learned,
      ss.completed,
      ss.next_steps,
      ss.created_at,
      ss.created_at_epoch
    FROM session_summaries ss
    LEFT JOIN sdk_sessions s ON ss.memory_session_id = s.memory_session_id
    WHERE (ss.project = ? OR ss.merged_into_project = ?)
    ORDER BY ss.created_at_epoch DESC
    LIMIT ?
  `).all(e,e,t.sessionCount+Ae)}function ut(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(","),a=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      o.id,
      o.memory_session_id,
      COALESCE(s.platform_source, 'claude') as platform_source,
      o.type,
      o.title,
      o.subtitle,
      o.narrative,
      o.facts,
      o.concepts,
      o.files_read,
      o.files_modified,
      o.discovery_tokens,
      o.created_at,
      o.created_at_epoch,
      o.project
    FROM observations o
    LEFT JOIN sdk_sessions s ON o.memory_session_id = s.memory_session_id
    WHERE (o.project IN (${a})
           OR o.merged_into_project IN (${a}))
      AND type IN (${n})
      AND EXISTS (
        SELECT 1 FROM json_each(o.concepts)
        WHERE value IN (${i})
      )
    ORDER BY o.created_at_epoch DESC
    LIMIT ?
  `).all(...e,...e,...s,...o,t.totalObservationCount)}function mt(r,e,t){let s=e.map(()=>"?").join(",");return r.db.prepare(`
    SELECT
      ss.id,
      ss.memory_session_id,
      COALESCE(s.platform_source, 'claude') as platform_source,
      ss.request,
      ss.investigated,
      ss.learned,
      ss.completed,
      ss.next_steps,
      ss.created_at,
      ss.created_at_epoch,
      ss.project
    FROM session_summaries ss
    LEFT JOIN sdk_sessions s ON ss.memory_session_id = s.memory_session_id
    WHERE (ss.project IN (${s})
           OR ss.merged_into_project IN (${s}))
    ORDER BY ss.created_at_epoch DESC
    LIMIT ?
  `).all(...e,...e,t.sessionCount+Ae)}function xs(r){return r.replace(/[/.]/g,"-")}function Ps(r){if(!r.includes('"type":"assistant"'))return null;let e=JSON.parse(r);if(e.type==="assistant"&&e.message?.content&&Array.isArray(e.message.content)){let t="";for(let s of e.message.content)s.type==="text"&&(t+=s.text);if(t=t.replace(He,"").trim(),t)return t}return null}function ws(r){for(let e=r.length-1;e>=0;e--)try{let t=Ps(r[e]);if(t)return t}catch(t){t instanceof Error?l.debug("WORKER","Skipping malformed transcript line",{lineIndex:e},t):l.debug("WORKER","Skipping malformed transcript line",{lineIndex:e,error:String(t)});continue}return""}function ks(r){try{if(!(0,Z.existsSync)(r))return{assistantMessage:""};let e=(0,Z.readFileSync)(r,"utf-8").trim();if(!e)return{assistantMessage:""};let t=e.split(`
`).filter(n=>n.trim());return{assistantMessage:ws(t)}}catch(e){return e instanceof Error?l.failure("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r},e):l.warn("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r,error:String(e)}),{assistantMessage:""}}}function pt(r,e,t,s){if(!e.showLastMessage||r.length===0)return{assistantMessage:""};let n=r.find(d=>d.memory_session_id!==t);if(!n)return{assistantMessage:""};let o=n.memory_session_id,i=xs(s),a=ct.default.join(y,"projects",i,`${o}.jsonl`);return ks(a)}function gt(r,e){let t=e[0]?.id;return r.map((s,n)=>{let o=n===0?null:e[n+1];return{...s,displayEpoch:o?o.created_at_epoch:s.created_at_epoch,displayTime:o?o.created_at:s.created_at,shouldShowLink:s.id!==t}})}function Tt(r,e){let t=[...r.map(s=>({type:"observation",data:s})),...e.map(s=>({type:"summary",data:s}))];return t.sort((s,n)=>{let o=s.type==="observation"?s.data.created_at_epoch:s.data.displayEpoch,i=n.type==="observation"?n.data.created_at_epoch:n.data.displayEpoch;return o-i}),t}function ft(r,e){return new Set(r.slice(0,e).map(t=>t.id))}function St(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function At(r){return[`# [${r}] recent context, ${St()}`,""]}function bt(){return[`Legend: \u{1F3AF}session ${C.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji}${t.id}`).join(" ")}`,"Format: ID TIME TYPE TITLE","Fetch details: get_observations([IDs]) | Search: mem-search skill",""]}function Q(r,e){let t=[],s=[`${r.totalObservations} obs (${r.totalReadTokens.toLocaleString()}t read)`,`${r.totalDiscoveryTokens.toLocaleString()}t work`];return r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)&&(e.showSavingsPercent?s.push(`${r.savingsPercent}% savings`):e.showSavingsAmount&&s.push(`${r.savings.toLocaleString()}t saved`)),t.push(`Stats: ${s.join(" | ")}`),t.push(""),t}function Rt(r){return[`### ${r}`]}function Ot(r){return r.toLowerCase().replace(" am","a").replace(" pm","p")}function ht(r,e,t){let s=r.title||"Untitled",n=C.getInstance().getTypeIcon(r.type),o=e?Ot(e):'"';return`${r.id} ${o} ${n} ${s}`}function Ct(r,e,t,s){let n=[],o=r.title||"Untitled",i=C.getInstance().getTypeIcon(r.type),a=e?Ot(e):'"',{readTokens:d,discoveryDisplay:_}=G(r,s);n.push(`**${r.id}** ${a} ${i} **${o}**`),t&&n.push(t);let c=[];return s.showReadTokens&&c.push(`~${d}t`),s.showWorkTokens&&c.push(_),c.length>0&&n.push(c.join(" ")),n.push(""),n}function It(r,e){return[`S${r.id} ${r.request||"Session started"} (${e})`]}function j(r,e){return e?[`**${r}**: ${e}`,""]:[]}function Nt(r){return r.assistantMessage?["","---","","**Previously**","",`A: ${r.assistantMessage}`,""]:[]}function Lt(r,e){return["",`Access ${Math.round(r/1e3)}k tokens of past work via get_observations([IDs]) or mem-search skill.`]}function Dt(r){return`# [${r}] recent context, ${St()}

No previous sessions found.`}function Mt(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function yt(r){return["",`${E.bright}${E.cyan}[${r}] recent context, ${Mt()}${E.reset}`,`${E.gray}${"\u2500".repeat(60)}${E.reset}`,""]}function vt(){let e=C.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji} ${t.id}`).join(" | ");return[`${E.dim}Legend: session-request | ${e}${E.reset}`,""]}function Ut(){return[`${E.bright}Column Key${E.reset}`,`${E.dim}  Read: Tokens to read this observation (cost to learn it now)${E.reset}`,`${E.dim}  Work: Tokens spent on work that produced this record ( research, building, deciding)${E.reset}`,""]}function xt(){return[`${E.dim}Context Index: This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${E.reset}`,"",`${E.dim}When you need implementation details, rationale, or debugging context:${E.reset}`,`${E.dim}  - Fetch by ID: get_observations([IDs]) for observations visible in this index${E.reset}`,`${E.dim}  - Search history: Use the mem-search skill for past decisions, bugs, and deeper research${E.reset}`,`${E.dim}  - Trust this index over re-reading code for past decisions and learnings${E.reset}`,""]}function te(r,e){let t=[];if(t.push(`${E.bright}${E.cyan}Context Economics${E.reset}`),t.push(`${E.dim}  Loading: ${r.totalObservations} observations (${r.totalReadTokens.toLocaleString()} tokens to read)${E.reset}`),t.push(`${E.dim}  Work investment: ${r.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions${E.reset}`),r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let s="  Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?s+=`${r.savings.toLocaleString()} tokens (${r.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?s+=`${r.savings.toLocaleString()} tokens`:s+=`${r.savingsPercent}% reduction from reuse`,t.push(`${E.green}${s}${E.reset}`)}return t.push(""),t}function Pt(r){return[`${E.bright}${E.cyan}${r}${E.reset}`,""]}function wt(r){return[`${E.dim}${r}${E.reset}`]}function kt(r,e,t,s){let n=r.title||"Untitled",o=C.getInstance().getTypeIcon(r.type),{readTokens:i,discoveryTokens:a,workEmoji:d}=G(r,s),_=t?`${E.dim}${e}${E.reset}`:" ".repeat(e.length),c=s.showReadTokens&&i>0?`${E.dim}(~${i}t)${E.reset}`:"",u=s.showWorkTokens&&a>0?`${E.dim}(${d} ${a.toLocaleString()}t)${E.reset}`:"";return`  ${E.dim}#${r.id}${E.reset}  ${_}  ${o}  ${n} ${c} ${u}`}function Ft(r,e,t,s,n){let o=[],i=r.title||"Untitled",a=C.getInstance().getTypeIcon(r.type),{readTokens:d,discoveryTokens:_,workEmoji:c}=G(r,n),u=t?`${E.dim}${e}${E.reset}`:" ".repeat(e.length),f=n.showReadTokens&&d>0?`${E.dim}(~${d}t)${E.reset}`:"",m=n.showWorkTokens&&_>0?`${E.dim}(${c} ${_.toLocaleString()}t)${E.reset}`:"";return o.push(`  ${E.dim}#${r.id}${E.reset}  ${u}  ${a}  ${E.bright}${i}${E.reset}`),s&&o.push(`    ${E.dim}${s}${E.reset}`),(f||m)&&o.push(`    ${f} ${m}`),o.push(""),o}function $t(r,e){let t=`${r.request||"Session started"} (${e})`;return[`${E.yellow}#S${r.id}${E.reset} ${t}`,""]}function X(r,e,t){return e?[`${t}${r}:${E.reset} ${e}`,""]:[]}function Ht(r){return r.assistantMessage?["","---","",`${E.bright}${E.magenta}Previously${E.reset}`,"",`${E.dim}A: ${r.assistantMessage}${E.reset}`,""]:[]}function Gt(r,e){let t=Math.round(r/1e3);return["",`${E.dim}Access ${t}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use the claude-mem skill to access memories by ID.${E.reset}`]}function jt(r){return`
${E.bright}${E.cyan}[${r}] recent context, ${Mt()}${E.reset}
${E.gray}${"\u2500".repeat(60)}${E.reset}

${E.dim}No previous sessions found for this project yet.${E.reset}
`}function Xt(r,e,t,s){let n=[];return s?n.push(...yt(r)):n.push(...At(r)),s?n.push(...vt()):n.push(...bt()),s&&(n.push(...Ut()),n.push(...xt())),x(t)&&(s?n.push(...te(e,t)):n.push(...Q(e,t))),n}var Re=L(require("path"),1);function re(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[]}catch(e){return l.debug("PARSER","Failed to parse JSON array, using empty fallback",{preview:r?.substring(0,50)},e instanceof Error?e:new Error(String(e))),[]}}function Oe(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0})}function he(r){return new Date(r).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}function Wt(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}function Bt(r,e){return Re.default.isAbsolute(r)?Re.default.relative(e,r):r}function Kt(r,e,t){let s=re(r);if(s.length>0)return Bt(s[0],e);if(t){let n=re(t);if(n.length>0)return Bt(n[0],e)}return"General"}function Fs(r){let e=new Map;for(let s of r){let n=s.type==="observation"?s.data.created_at:s.data.displayTime,o=Wt(n);e.has(o)||e.set(o,[]),e.get(o).push(s)}let t=Array.from(e.entries()).sort((s,n)=>{let o=new Date(s[0]).getTime(),i=new Date(n[0]).getTime();return o-i});return new Map(t)}function Yt(r,e){return e.fullObservationField==="narrative"?r.narrative:r.facts?re(r.facts).join(`
`):null}function $s(r,e,t,s){let n=[];n.push(...Rt(r));let o="";for(let i of e)if(i.type==="summary"){let a=i.data,d=Oe(a.displayTime);n.push(...It(a,d))}else{let a=i.data,d=he(a.created_at),c=d!==o?d:"";if(o=d,t.has(a.id)){let f=Yt(a,s);n.push(...Ct(a,c,f,s))}else n.push(ht(a,c,s))}return n}function Hs(r,e,t,s,n){let o=[];o.push(...Pt(r));let i=null,a="";for(let d of e)if(d.type==="summary"){i=null,a="";let _=d.data,c=Oe(_.displayTime);o.push(...$t(_,c))}else{let _=d.data,c=Kt(_.files_modified,n,_.files_read),u=he(_.created_at),f=u!==a;a=u;let m=t.has(_.id);if(c!==i&&(o.push(...wt(c)),i=c),m){let A=Yt(_,s);o.push(...Ft(_,u,f,A,s))}else o.push(kt(_,u,f,s))}return o.push(""),o}function Gs(r,e,t,s,n,o){return o?Hs(r,e,t,s,n):$s(r,e,t,s)}function Vt(r,e,t,s,n){let o=[],i=Fs(r);for(let[a,d]of i)o.push(...Gs(a,d,e,t,s,n));return o}function qt(r,e,t){return!(!r.showLastSummary||!e||!!!(e.investigated||e.learned||e.completed||e.next_steps)||t&&e.created_at_epoch<=t.created_at_epoch)}function Jt(r,e){let t=[];return e?(t.push(...X("Investigated",r.investigated,E.blue)),t.push(...X("Learned",r.learned,E.yellow)),t.push(...X("Completed",r.completed,E.green)),t.push(...X("Next Steps",r.next_steps,E.magenta))):(t.push(...j("Investigated",r.investigated)),t.push(...j("Learned",r.learned)),t.push(...j("Completed",r.completed)),t.push(...j("Next Steps",r.next_steps))),t}function zt(r,e){return e?Ht(r):Nt(r)}function Zt(r,e,t){return!x(e)||r.totalDiscoveryTokens<=0||r.savings<=0?[]:t?Gt(r.totalDiscoveryTokens,r.totalReadTokens):Lt(r.totalDiscoveryTokens,r.totalReadTokens)}var js=Qt.default.join((0,es.homedir)(),".claude","plugins","marketplaces","thedotmack","plugin",".install-version");function Xs(){try{return new V}catch(r){if(r instanceof Error&&r.code==="ERR_DLOPEN_FAILED"){try{(0,ts.unlinkSync)(js)}catch(e){e instanceof Error?l.debug("WORKER","Marker file cleanup failed (may not exist)",{},e):l.debug("WORKER","Marker file cleanup failed (may not exist)",{error:String(e)})}return l.error("WORKER","Native module rebuild needed - restart Claude Code to auto-fix"),null}throw r}}function Bs(r,e){return e?jt(r):Dt(r)}function Ws(r,e,t,s,n,o,i,a=!1){let d=[],_=be(e);if(a)return x(s)?(i?te(_,s):Q(_,s)).join(`
`).trimEnd():"";d.push(...Xt(r,_,s,i));let c=t.slice(0,s.sessionCount),u=gt(c,t),f=Tt(e,u),m=ft(e,s.fullObservationCount);d.push(...Vt(f,m,s,n,i));let A=t[0],R=e[0];qt(s,A,R)&&d.push(...Jt(A,i));let p=pt(e,s,o,n);return d.push(...zt(p,i)),d.push(...Zt(_,s,i)),d.join(`
`).trimEnd()}var Ks=new Set(["bugfix","discovery","decision","refactor"]);function Ys(r,e,t){let s=be(r),n={bugfix:0,discovery:0,decision:0,refactor:0,other:0},o=new Set,i=Number.POSITIVE_INFINITY;for(let d of r){let _=Ks.has(d.type)?d.type:"other";n[_]++,d.memory_session_id&&o.add(d.memory_session_id),d.created_at_epoch&&d.created_at_epoch<i&&(i=d.created_at_epoch)}let a=Number.isFinite(i)?Math.max(0,Math.floor((Date.now()-i)/864e5)):0;return{observation_count:r.length,session_count:o.size,timeline_depth_days:a,has_session_summary:e.length>0,obs_type_bugfix:n.bugfix,obs_type_discovery:n.discovery,obs_type_decision:n.decision,obs_type_refactor:n.refactor,obs_type_other:n.other,tokens_injected:s.totalReadTokens,tokens_saved_vs_naive:s.savings,search_strategy:t?"full":"timeline"}}async function Ce(r,e=!1){let t=at(),s=r?.cwd??process.cwd(),n=it(s),o=r?.projects?.length?r.projects:n.allProjects,i=o[o.length-1]??n.primary;r?.full&&(t.totalObservationCount=999999,t.sessionCount=999999);let a=Xs();if(!a)return{text:"",stats:null};try{let d=o.length>1?ut(a,o,t):Et(a,i,t),_=o.length>1?mt(a,o,t):lt(a,i,t);return d.length===0&&_.length===0?{text:Bs(i,e),stats:null}:{text:Ws(i,d,_,t,s,r?.session_id,e,r?.economicsOnly),stats:Ys(d,_,!!r?.full)}}finally{a.close()}}async function ss(r,e=!1){return(await Ce(r,e)).text}0&&(module.exports={generateContext,generateContextWithStats});

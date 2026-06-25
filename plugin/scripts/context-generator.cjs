"use strict";var cs=Object.create;var V=Object.defineProperty;var ls=Object.getOwnPropertyDescriptor;var us=Object.getOwnPropertyNames;var ps=Object.getPrototypeOf,ms=Object.prototype.hasOwnProperty;var v=(r,e,t)=>()=>{if(t)throw t[0];try{return r&&(e=r(r=0)),e}catch(s){throw t=[s],s}};var gs=(r,e)=>{for(var t in e)V(r,t,{get:e[t],enumerable:!0})},ve=(r,e,t,s)=>{if(e&&typeof e=="object"||typeof e=="function")for(let n of us(e))!ms.call(r,n)&&n!==t&&V(r,n,{get:()=>e[n],enumerable:!(s=ls(e,n))||s.enumerable});return r};var M=(r,e,t)=>(t=r!=null?cs(ps(r)):{},ve(e||!r||!r.__esModule?V(t,"default",{value:r,enumerable:!0}):t,r)),Ts=r=>ve(V({},"__esModule",{value:!0}),r);function Ss(r){return(fs??process.stderr.write.bind(process.stderr))(r)}function _e(r){Ss(r)}var fs,Ue=v(()=>{"use strict";fs=null});var L,xe,Ee,de,ce,l,I=v(()=>{"use strict";L=require("fs"),xe=require("path");U();Ue();Ee=(o=>(o[o.DEBUG=0]="DEBUG",o[o.INFO=1]="INFO",o[o.WARN=2]="WARN",o[o.ERROR=3]="ERROR",o[o.SILENT=4]="SILENT",o))(Ee||{}),de=null,ce=class{level=null;useColor;logFilePath=null;logFileInitialized=!1;constructor(){this.useColor=process.stdout.isTTY??!1}ensureLogFileInitialized(){if(!this.logFileInitialized){this.logFileInitialized=!0;try{let e=$.logsDir();(0,L.existsSync)(e)||(0,L.mkdirSync)(e,{recursive:!0});let t=new Date().toISOString().split("T")[0];this.logFilePath=(0,xe.join)(e,`claude-mem-${t}.log`)}catch(e){console.error("[LOGGER] Failed to initialize log file:",e instanceof Error?e.message:String(e)),this.logFilePath=null}}}getLevel(){if(this.level===null)try{let e=$.settings();if((0,L.existsSync)(e)){let t=(0,L.readFileSync)(e,"utf-8"),n=(JSON.parse(t).CLAUDE_MEM_LOG_LEVEL||"INFO").toUpperCase();this.level=Ee[n]??1}else this.level=1}catch(e){console.error("[LOGGER] Failed to load log level from settings:",e instanceof Error?e.message:String(e)),this.level=1}return this.level}formatData(e){if(e==null)return"";if(typeof e=="string")return e;if(typeof e=="number"||typeof e=="boolean")return e.toString();if(typeof e=="object"){if(e instanceof Error)return this.getLevel()===0?`${e.message}
${e.stack}`:e.message;if(Array.isArray(e))return`[${e.length} items]`;let t=Object.keys(e);return t.length===0?"{}":t.length<=3?JSON.stringify(e):`{${t.length} keys: ${t.slice(0,3).join(", ")}...}`}return String(e)}formatTool(e,t){if(!t)return e;let s=t;if(typeof t=="string")try{s=JSON.parse(t)}catch{s=t}if(e==="Bash"&&s.command)return`${e}(${s.command})`;if(s.file_path)return`${e}(${s.file_path})`;if(s.notebook_path)return`${e}(${s.notebook_path})`;if(e==="Glob"&&s.pattern)return`${e}(${s.pattern})`;if(e==="Grep"&&s.pattern)return`${e}(${s.pattern})`;if(s.url)return`${e}(${s.url})`;if(s.query)return`${e}(${s.query})`;if(e==="Task"){if(s.subagent_type)return`${e}(${s.subagent_type})`;if(s.description)return`${e}(${s.description})`}return e==="Skill"&&s.skill?`${e}(${s.skill})`:e==="LSP"&&s.operation?`${e}(${s.operation})`:e}formatTimestamp(e){let t=e.getFullYear(),s=String(e.getMonth()+1).padStart(2,"0"),n=String(e.getDate()).padStart(2,"0"),o=String(e.getHours()).padStart(2,"0"),i=String(e.getMinutes()).padStart(2,"0"),a=String(e.getSeconds()).padStart(2,"0"),_=String(e.getMilliseconds()).padStart(3,"0");return`${t}-${s}-${n} ${o}:${i}:${a}.${_}`}log(e,t,s,n,o){if(e<this.getLevel())return;this.ensureLogFileInitialized();let i=this.formatTimestamp(new Date),a=Ee[e].padEnd(5),_=t.padEnd(6),d="";n?.correlationId?d=`[${n.correlationId}] `:n?.sessionId&&(d=`[session-${n.sessionId}] `);let E="";if(o!=null)if(o instanceof Error)E=this.getLevel()===0?`
${o.message}
${o.stack}`:` ${o.message}`;else if(this.getLevel()===0&&typeof o=="object")try{E=`
`+JSON.stringify(o,null,2)}catch{E=" "+this.formatData(o)}else E=" "+this.formatData(o);let u="";if(n){let{sessionId:m,memorySessionId:f,correlationId:b,...p}=n;Object.keys(p).length>0&&(u=` {${Object.entries(p).map(([R,A])=>`${R}=${A}`).join(", ")}}`)}let T=`[${i}] [${a}] [${_}] ${d}${s}${u}${E}`;if(this.logFilePath)try{(0,L.appendFileSync)(this.logFilePath,T+`
`,"utf8")}catch(m){_e(`[LOGGER] Failed to write to log file: ${m instanceof Error?m.message:String(m)}
`)}else _e(T+`
`)}debug(e,t,s,n){this.log(0,e,t,s,n)}info(e,t,s,n){this.log(1,e,t,s,n)}warn(e,t,s,n){this.log(2,e,t,s,n)}setErrorSink(e){de=e}error(e,t,s,n){this.log(3,e,t,s,n),this.routeErrorToSink(t,s,n)}routeErrorToSink(e,t,s){try{if(!de||!(s instanceof Error))return;de(s)}catch{}}dataIn(e,t,s,n){this.info(e,`\u2192 ${t}`,s,n)}dataOut(e,t,s,n){this.info(e,`\u2190 ${t}`,s,n)}success(e,t,s,n){this.info(e,`\u2713 ${t}`,s,n)}failure(e,t,s,n){this.error(e,`\u2717 ${t}`,s,n)}happyPathError(e,t,s,n,o=""){let d=((new Error().stack||"").split(`
`)[2]||"").match(/at\s+(?:.*\s+)?\(?([^:]+):(\d+):(\d+)\)?/),E=d?`${d[1].split("/").pop()}:${d[2]}`:"unknown",u={...s,location:E};return this.warn(e,`[HAPPY-PATH] ${t}`,u,n),o}},l=new ce});function As(){return typeof __dirname<"u"?__dirname:(0,g.dirname)((0,Pe.fileURLToPath)(Ds.url))}function bs(){if(process.env.CLAUDE_MEM_DATA_DIR)return process.env.CLAUDE_MEM_DATA_DIR;let r=(0,g.join)((0,le.homedir)(),".claude-mem"),e=(0,g.join)(r,"settings.json");try{if((0,x.existsSync)(e)){let t=JSON.parse((0,x.readFileSync)(e,"utf-8")),s=t.env??t;if(s.CLAUDE_MEM_DATA_DIR)return s.CLAUDE_MEM_DATA_DIR}}catch{}return r}function Fe(r){(0,x.mkdirSync)(r,{recursive:!0})}function $e(){return(0,g.join)(Rs,"..")}var g,le,x,Pe,Ds,Rs,O,P,lr,Os,hs,Cs,Is,Ns,ur,we,Ls,ke,ue,pr,mr,gr,$,U=v(()=>{"use strict";g=require("path"),le=require("os"),x=require("fs"),Pe=require("url");I();Ds={};Rs=As();O=bs(),P=process.env.CLAUDE_CONFIG_DIR||(0,g.join)((0,le.homedir)(),".claude"),lr=(0,g.join)(P,"plugins","marketplaces","thedotmack"),Os=(0,g.join)(O,"archives"),hs=(0,g.join)(O,"logs"),Cs=(0,g.join)(O,"trash"),Is=(0,g.join)(O,"backups"),Ns=(0,g.join)(O,"modes"),ur=(0,g.join)(O,"settings.json"),we=(0,g.join)(O,"claude-mem.db"),Ls=(0,g.join)(O,"vector-db"),ke=(0,g.join)(O,"observer-sessions"),ue=(0,g.basename)(ke),pr=(0,g.join)(P,"settings.json"),mr=(0,g.join)(P,"commands"),gr=(0,g.join)(P,"CLAUDE.md");$={dataDir:()=>O,workerPid:()=>(0,g.join)(O,"worker.pid"),serverBetaPid:()=>(0,g.join)(O,".server-beta.pid"),serverBetaPort:()=>(0,g.join)(O,".server-beta.port"),serverBetaRuntime:()=>(0,g.join)(O,".server-beta.runtime.json"),settings:()=>(0,g.join)(O,"settings.json"),database:()=>(0,g.join)(O,"claude-mem.db"),chroma:()=>(0,g.join)(O,"chroma"),combinedCerts:()=>(0,g.join)(O,"combined_certs.pem"),transcriptsConfig:()=>(0,g.join)(O,"transcript-watch.json"),transcriptsState:()=>(0,g.join)(O,"transcript-watch-state.json"),corpora:()=>(0,g.join)(O,"corpora"),supervisorRegistry:()=>(0,g.join)(O,"supervisor.json"),envFile:()=>(0,g.join)(O,".env"),logsDir:()=>hs,archives:()=>Os,trash:()=>Cs,backups:()=>Is,modes:()=>Ns,vectorDb:()=>Ls,observerSessions:()=>ke}});function et(r){return process.platform==="win32"?Math.round(r*Ae.WINDOWS_MULTIPLIER):r}var Ae,tt=v(()=>{"use strict";Ae={DEFAULT:3e5,HEALTH_CHECK:3e3,API_REQUEST:3e4,HOOK_READINESS_WAIT:1e4,POST_SPAWN_WAIT:15e3,READINESS_WAIT:3e4,PORT_IN_USE_WAIT:3e3,WORKER_STARTUP_WAIT:1e3,PRE_RESTART_SETTLE_DELAY:2e3,POWERSHELL_COMMAND:1e4,WINDOWS_MULTIPLIER:1.5}});var N,H,Re,k,be=v(()=>{"use strict";N=require("fs"),H=require("path"),Re=require("os");tt();k=class{static DEFAULTS={CLAUDE_MEM_MODEL:"claude-haiku-4-5-20251001",CLAUDE_MEM_CONTEXT_OBSERVATIONS:"50",CLAUDE_MEM_WORKER_PORT:String(37700+(process.getuid?.()??77)%100),CLAUDE_MEM_WORKER_HOST:"127.0.0.1",CLAUDE_MEM_API_TIMEOUT_MS:String(et(Ae.API_REQUEST)),CLAUDE_MEM_SKIP_TOOLS:"ListMcpResourcesTool,SlashCommand,Skill,TodoWrite,AskUserQuestion",CLAUDE_MEM_PROVIDER:"claude",CLAUDE_MEM_CLAUDE_AUTH_METHOD:"subscription",CLAUDE_MEM_GEMINI_API_KEY:"",CLAUDE_MEM_GEMINI_MODEL:"gemini-2.5-flash-lite",CLAUDE_MEM_GEMINI_RATE_LIMITING_ENABLED:"true",CLAUDE_MEM_GEMINI_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_GEMINI_MAX_TOKENS:"100000",CLAUDE_MEM_OPENROUTER_API_KEY:"",CLAUDE_MEM_OPENROUTER_MODEL:"xiaomi/mimo-v2-flash:free",CLAUDE_MEM_OPENROUTER_BASE_URL:"",CLAUDE_MEM_OPENROUTER_SITE_URL:"",CLAUDE_MEM_OPENROUTER_APP_NAME:"claude-mem",CLAUDE_MEM_OPENROUTER_MAX_CONTEXT_MESSAGES:"20",CLAUDE_MEM_OPENROUTER_MAX_TOKENS:"100000",CLAUDE_MEM_CUSTOM_API_KEY:"",CLAUDE_MEM_CUSTOM_MODEL:"",CLAUDE_MEM_CUSTOM_BASE_URL:"",CLAUDE_MEM_DATA_DIR:(0,H.join)((0,Re.homedir)(),".claude-mem"),CLAUDE_MEM_LOG_LEVEL:"INFO",CLAUDE_MEM_PYTHON_VERSION:"3.13",CLAUDE_CODE_PATH:"",CLAUDE_MEM_MODE:"code",CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT:"false",CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT:"true",CLAUDE_MEM_CONTEXT_FULL_COUNT:"0",CLAUDE_MEM_CONTEXT_FULL_FIELD:"narrative",CLAUDE_MEM_CONTEXT_SESSION_COUNT:"10",CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY:"true",CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE:"false",CLAUDE_MEM_CONTEXT_SHOW_TERMINAL_OUTPUT:"true",CLAUDE_MEM_WELCOME_HINT_ENABLED:"true",CLAUDE_MEM_FOLDER_CLAUDEMD_ENABLED:"false",CLAUDE_MEM_FOLDER_USE_LOCAL_MD:"false",CLAUDE_MEM_TRANSCRIPTS_ENABLED:"true",CLAUDE_MEM_TRANSCRIPTS_CONFIG_PATH:(0,H.join)((0,Re.homedir)(),".claude-mem","transcript-watch.json"),CLAUDE_MEM_CODEX_TRANSCRIPT_INGESTION:"false",CLAUDE_MEM_MAX_CONCURRENT_AGENTS:"2",CLAUDE_MEM_HOOK_FAIL_LOUD_THRESHOLD:"3",CLAUDE_MEM_ALLOWED_PROJECTS:"",CLAUDE_MEM_EXCLUDED_PROJECTS:"",CLAUDE_MEM_FOLDER_MD_EXCLUDE:"[]",CLAUDE_MEM_FOLDER_MD_SKELETON_DENYLIST:"[]",CLAUDE_MEM_SEMANTIC_INJECT:"false",CLAUDE_MEM_SEMANTIC_INJECT_LIMIT:"5",CLAUDE_MEM_TIER_ROUTING_ENABLED:"true",CLAUDE_MEM_TIER_SIMPLE_MODEL:"haiku",CLAUDE_MEM_TIER_SUMMARY_MODEL:"",CLAUDE_MEM_TIER_FAST_MODEL:"haiku",CLAUDE_MEM_TIER_SMART_MODEL:"sonnet",CLAUDE_MEM_CHROMA_ENABLED:"true",CLAUDE_MEM_CHROMA_MODE:"local",CLAUDE_MEM_CHROMA_HOST:"127.0.0.1",CLAUDE_MEM_CHROMA_PORT:"8000",CLAUDE_MEM_CHROMA_SSL:"false",CLAUDE_MEM_CHROMA_API_KEY:"",CLAUDE_MEM_CHROMA_TENANT:"default_tenant",CLAUDE_MEM_CHROMA_DATABASE:"default_database",CLAUDE_MEM_TELEGRAM_ENABLED:"true",CLAUDE_MEM_TELEGRAM_BOT_TOKEN:"",CLAUDE_MEM_TELEGRAM_CHAT_ID:"",CLAUDE_MEM_TELEGRAM_TRIGGER_TYPES:"security_alert",CLAUDE_MEM_TELEGRAM_TRIGGER_CONCEPTS:"",CLAUDE_MEM_QUEUE_ENGINE:"sqlite",CLAUDE_MEM_REDIS_URL:"",CLAUDE_MEM_REDIS_HOST:"127.0.0.1",CLAUDE_MEM_REDIS_PORT:"6379",CLAUDE_MEM_REDIS_MODE:"external",CLAUDE_MEM_QUEUE_REDIS_PREFIX:`claude_mem_${process.env.CLAUDE_MEM_WORKER_PORT??String(37700+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_AUTH_MODE:"api-key",CLAUDE_MEM_RUNTIME:"worker",CLAUDE_MEM_SERVER_BETA_URL:`http://127.0.0.1:${process.env.CLAUDE_MEM_SERVER_PORT??String(37877+(process.getuid?.()??77)%100)}`,CLAUDE_MEM_SERVER_BETA_API_KEY:"",CLAUDE_MEM_SERVER_BETA_PROJECT_ID:"",CLAUDE_MEM_REDACTION_ENABLED:"true",CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES:"",CLAUDE_MEM_REDACTION_EMAIL_ALLOWLIST:"",CLAUDE_MEM_REDACTION_LOCALE_PATTERNS:"{}",CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES:"{}",CLAUDE_MEM_REDACTION_PRESIDIO_ENABLED:"false",CLAUDE_MEM_REDACTION_PRESIDIO_TIMEOUT_MS:"2000",CLAUDE_MEM_REDACTION_PRESIDIO_STARTUP_TIMEOUT_MS:"60000",CLAUDE_MEM_REDACTION_PRESIDIO_ENTITIES:"PERSON,LOCATION,NRP,ORGANIZATION,ADDRESS",CLAUDE_MEM_REDACTION_PRESIDIO_SCORE_THRESHOLD:"0.5"};static getAllDefaults(){return{...this.DEFAULTS}}static get(e){return process.env[e]??this.DEFAULTS[e]}static getInt(e){let t=this.get(e);return parseInt(t,10)}static getBool(e){let t=this.get(e);return t==="true"||t===!0}static applyEnvOverrides(e){let t={...e};for(let s of Object.keys(this.DEFAULTS))process.env[s]!==void 0&&(t[s]=process.env[s]);return t}static loadFromFile(e,t=!0){try{if(!(0,N.existsSync)(e)){let a=this.getAllDefaults();try{let _=(0,H.dirname)(e);(0,N.existsSync)(_)||(0,N.mkdirSync)(_,{recursive:!0}),(0,N.writeFileSync)(e,JSON.stringify(a,null,2),"utf-8"),console.warn("[SETTINGS] Created settings file with defaults:",e)}catch(_){console.warn("[SETTINGS] Failed to create settings file, using in-memory defaults:",e,_ instanceof Error?_.message:String(_))}return t?this.applyEnvOverrides(a):a}let s=(0,N.readFileSync)(e,"utf-8"),n=JSON.parse(s.replace(/^\uFEFF/,"")),o=n;if(n.env&&typeof n.env=="object"){o=n.env;try{(0,N.writeFileSync)(e,JSON.stringify(o,null,2),"utf-8"),console.warn("[SETTINGS] Migrated settings file from nested to flat schema:",e)}catch(a){console.warn("[SETTINGS] Failed to auto-migrate settings file:",e,a instanceof Error?a.message:String(a))}}let i={...this.DEFAULTS};for(let a of Object.keys(this.DEFAULTS))o[a]!==void 0&&(i[a]=o[a]);return t?this.applyEnvOverrides(i):i}catch(s){console.warn("[SETTINGS] Failed to load settings, using defaults:",e,s instanceof Error?s.message:String(s));let n=this.getAllDefaults();return t?this.applyEnvOverrides(n):n}}}});function $s(){return process.env.CLAUDE_MEM_DATA_DIR||Oe.default.join(nt.default.homedir(),".claude-mem")}function st(r){return r.split(",").map(e=>e.trim()).filter(Boolean)}function rt(r,e){try{return JSON.parse(r)}catch{return e}}function ot(r,e){let t=r.toLowerCase(),[s,n]=t.split("@");if(s==="noreply"||s==="no-reply"||n==="example.com"||n==="example.org"||n==="example.net")return!0;for(let o of e){let i=o.toLowerCase();if(i.startsWith("@")&&n===i.slice(1)||i===n||i===t)return!0}return!1}function it(r){let e=k.loadFromFile(Oe.default.join($s(),"settings.json")),t=E=>e[E]??"",s=t("CLAUDE_MEM_REDACTION_ENABLED")!=="false",n=new Set(st(t("CLAUDE_MEM_REDACTION_DISABLED_CATEGORIES"))),o=st(t("CLAUDE_MEM_REDACTION_EMAIL_ALLOWLIST")),i=rt(t("CLAUDE_MEM_REDACTION_PROJECT_OVERRIDES"),{}),a=r?i[r]:void 0;if(a){a.enabled===!1&&(s=!1);for(let E of a.disabledCategories??[])n.add(E);a.emailAllowlist&&(o=[...o,...a.emailAllowlist])}let _=rt(t("CLAUDE_MEM_REDACTION_LOCALE_PATTERNS"),{}),d=[];for(let[E,u]of Object.entries(_))try{d.push({category:"NATIONAL_ID",label:E,regex:new RegExp(u,"g")})}catch{}return{enabled:s,disabled:n,emailAllowlist:o,localePatterns:d}}var nt,Oe,at=v(()=>{"use strict";nt=M(require("os"),1),Oe=M(require("path"),1);be()});var nr={};gs(nr,{generateContext:()=>Es,generateContextWithStats:()=>Me});module.exports=Ts(nr);var as=M(require("path"),1),_s=require("os"),ds=require("fs");var he=require("bun:sqlite");U();I();var He=require("crypto");function pe(r,e,t){return(0,He.createHash)("sha256").update([r||"",e||"",t||""].join("\0")).digest("hex").slice(0,16)}function me(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[String(e)]}catch{return[r]}}var h="claude";function Ms(r){return r.trim().toLowerCase().replace(/\s+/g,"-")}function w(r){if(!r)return h;let e=Ms(r);return e?e==="transcript"||e.includes("codex")?"codex":e.includes("cursor")?"cursor":e.includes("claude")?"claude":e:h}function Ge(r){let e=["claude","codex","cursor"];return[...r].sort((t,s)=>{let n=e.indexOf(t),o=e.indexOf(s);return n!==-1||o!==-1?n===-1?1:o===-1?-1:n-o:t.localeCompare(s)})}function je(r,e,t,s){let n=Date.now()-s;return r.prepare(`
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
  `).get(e,t,n)??void 0}I();var We=["private","claude-mem-context","system_instruction","system-instruction","persisted-output","system-reminder"],Xe=new RegExp(`<(${We.join("|")})\\b[^>]*>[\\s\\S]*?</\\1>`,"g"),Ke=/<system-reminder>[\s\S]*?<\/system-reminder>/g,Be=100;function ys(r){let e=Object.fromEntries(We.map(n=>[n,0]));Xe.lastIndex=0;let t=0,s=r.replace(Xe,(n,o)=>(e[o]=(e[o]??0)+1,t+=1,""));return t>Be&&l.warn("SYSTEM","tag count exceeds limit",void 0,{tagCount:t,maxAllowed:Be,contentLength:r.length}),{stripped:s.trim(),counts:e}}function Ye(r){return ys(r).stripped}var vs=["task-notification"],hr=new RegExp(`^\\s*<(${vs.join("|")})\\b[^>]*>(?:(?!<\\1\\b|</\\1\\b)[\\s\\S])*</\\1>\\s*$`),Cr=256*1024;I();var ge=4e3;function q(r){let e=r.trim(),s=Ye(r).trim()||e;return s.length<=ge?s:(l.debug("DB","Truncated stored prompt text to the configured cap",{originalLength:s.length,storedLength:ge}),`${s.slice(0,ge-1)}\u2026`)}I();var Us=/^(?:your[_-]?\w*|changeme|your-key-here|example\w*|x{3,}|<[^>]*>|\$\{?\w+\}?)$/i,xs=/^[A-Z][A-Z0-9_]{2,}$/;function Ps(r){let e=r.trim();return Us.test(e)||xs.test(e)}function Ve(r){let e=r.replace(/\D/g,"");if(e.length>15)return r;let t=r.trimStart().startsWith("+");return t&&e.length>=8||!t&&e.length>=10?"[REDACTED:PHONE]":r}function ws(r){let e=r.replace(/\s/g,"").toUpperCase();if(!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(e))return!1;let t=e.slice(4)+e.slice(0,4),s=0;for(let n of t){let o=n>="A"&&n<="Z"?String(n.charCodeAt(0)-55):n;for(let i of o)s=(s*10+(i.charCodeAt(0)-48))%97}return s===1}function ks(r){let e=r.replace(/[ -]/g,"");if(!/^\d{13,19}$/.test(e))return!1;let t=0,s=!1;for(let n=e.length-1;n>=0;n--){let o=e.charCodeAt(n)-48;s&&(o*=2,o>9&&(o-=9)),t+=o,s=!s}return t%10===0}var Te=/\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,24}\b/g,qe=/(?<![\w.])(?:\+\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d{2,4}(?:[\s.-]\d{2,4}){1,3}(?![\w])/g,Je=/\b\d{1,5}\s+(?:[A-Z][a-zA-Z]+\s){1,3}(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Way|Square|Sq|Terrace|Ter)\b\.?/g,ze=[{category:"SECRETS",label:"PRIVATE_KEY",regex:/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----[\s\S]{0,100000}?-----END (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g},{category:"SECRETS",label:"PRIVATE_KEY",regex:/-----BEGIN (?:[A-Z0-9 ]+ )?PRIVATE KEY-----/g},{category:"SECRETS",label:"SSH_KEY",regex:/\bssh-(?:rsa|ed25519|dss)\s+AAAA[A-Za-z0-9+/=]{20,}/g},{category:"SECRETS",label:"JWT",regex:/\beyJ[A-Za-z0-9_-]{3,4096}\.eyJ[A-Za-z0-9_-]{3,4096}\.[A-Za-z0-9_-]{3,4096}/g},{category:"SECRETS",label:"ANTHROPIC_KEY",regex:/\bsk-ant-[A-Za-z0-9_-]{8,}/g},{category:"SECRETS",label:"OPENROUTER_KEY",regex:/\bsk-or-v1-[A-Za-z0-9]{8,}/g},{category:"SECRETS",label:"LANGFUSE_KEY",regex:/\bsk-lf-[A-Za-z0-9-]{8,}/g},{category:"SECRETS",label:"OPENAI_PROJECT_KEY",regex:/\bsk-proj-[A-Za-z0-9_-]{8,}/g},{category:"SECRETS",label:"CONTEXT7_KEY",regex:/\bctx7sk-[A-Za-z0-9]{8,}/g},{category:"SECRETS",label:"GITHUB_PAT",regex:/\b(?:gh[opusr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/g},{category:"SECRETS",label:"GITLAB_PAT",regex:/\bglpat-[A-Za-z0-9_-]{20,}/g},{category:"SECRETS",label:"AWS_ACCESS_KEY",regex:/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g},{category:"SECRETS",label:"GOOGLE_API_KEY",regex:/\bAIza[0-9A-Za-z_-]{35}\b/g},{category:"SECRETS",label:"SLACK_TOKEN",regex:/\bxox[baprs]-[A-Za-z0-9-]{8,}/g},{category:"SECRETS",label:"STRIPE_KEY",regex:/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]{8,}/g},{category:"SECRETS",label:"SENDGRID_KEY",regex:/\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g},{category:"SECRETS",label:"HUGGINGFACE_TOKEN",regex:/\bhf_[A-Za-z0-9]{16,}/g},{category:"SECRETS",label:"REPLICATE_TOKEN",regex:/\br8_[A-Za-z0-9]{16,}/g},{category:"SECRETS",label:"DIGITALOCEAN_TOKEN",regex:/\bdop_v1_[A-Za-z0-9]{32,}/g},{category:"SECRETS",label:"NPM_TOKEN",regex:/\bnpm_[A-Za-z0-9]{36}\b/g},{category:"SECRETS",label:"PYPI_TOKEN",regex:/\bpypi-[A-Za-z0-9_-]{16,}/g},{category:"SECRETS",label:"SHOPIFY_TOKEN",regex:/\b(?:shpat|shppa)_[A-Fa-f0-9]{32}\b/g},{category:"SECRETS",label:"GENERIC_API_KEY",regex:/\bsk-[A-Za-z0-9]{20,}\b/g},{category:"SECRETS",label:"BEARER_TOKEN",regex:/\bBearer\s+[A-Za-z0-9._-]{8,}/g},{category:"SECRETS",label:"BASIC_AUTH",regex:/\b([a-z][a-z0-9+.-]*:\/\/)[^/\s:@]+:[^/\s@]+@/gi,replace:(r,e)=>`${e}[REDACTED:BASIC_AUTH]@`},{category:"SECRETS",label:"SECRET",regex:/\b(password|passwd|secret|api[_-]?key|access[_-]?key|client[_-]?secret|auth[_-]?token)(\s*[:=]\s*)(?:"([^"]{1,200})"|'([^']{1,200})'|([^\s"']{8,200}))/gi,replace:(r,e,t,s,n,o)=>{let i=s??n??o??"",a=s!==void 0||n!==void 0;return Ps(i)||!a&&i.length<8?r:`${e}${t}[REDACTED:SECRET]`}},{category:"FINANCIAL",label:"CREDIT_CARD",regex:/\b(?:\d[ -]?){13,19}\b/g,replace:r=>{let e=r.replace(/[ -]/g,"");return/^(\d)\1+$/.test(e)?r:ks(e)?"[REDACTED:CREDIT_CARD]":r}},{category:"FINANCIAL",label:"IBAN",regex:/\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g,replace:r=>ws(r)?"[REDACTED:IBAN]":r},{category:"FINANCIAL",label:"ETH_ADDRESS",regex:/\b0x[0-9a-fA-F]{40}\b/g},{category:"FINANCIAL",label:"BTC_ADDRESS",regex:/\b(?:bc1[ac-hj-np-z02-9]{11,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g},{category:"NATIONAL_ID",label:"US_SSN",regex:/\b(?!000|666|9\d\d)\d{3}-(?!00)\d{2}-(?!0000)\d{4}\b/g},{category:"NATIONAL_ID",label:"US_EIN",regex:/\b\d{2}-\d{7}\b/g},{category:"NATIONAL_ID",label:"EU_VAT",regex:/\b(?:AT|BE|BG|CY|CZ|DE|DK|EE|EL|ES|FI|FR|HR|HU|IE|IT|LT|LU|LV|MT|NL|PL|PT|RO|SE|SI|SK)\d[0-9A-Z]{7,11}\b/g},{category:"NATIONAL_ID",label:"UA_TAX_ID",regex:/(?:ІПН|ИНН|РНОКПП|tax(?:payer)?\s*(?:id|number))\D{0,10}\d{10}\b/gi,replace:r=>r.replace(/\d{10}\b/,"[REDACTED:UA_TAX_ID]")},{category:"GEO",label:"GEO_COORD",regex:/\b[-+]?(?:90(?:\.0+)?|[0-8]?\d\.\d{3,}),\s*[-+]?(?:180(?:\.0+)?|1[0-7]\d\.\d{3,}|\d?\d\.\d{3,})\b/g}];var Ze=require("node:child_process"),J=null;function fe(r,e){try{let t=(0,Ze.execFileSync)("git",r,{cwd:e,encoding:"utf8",stdio:["ignore","pipe","ignore"]});return typeof t=="string"?t.trim():""}catch{return""}}function Fs(r=process.cwd()){if(J)return J;let e=new Set,t=new Set,s=new Set,n=(o,i)=>{if(o&&e.add(o),i){t.add(i);let a=i.split("@")[0]??"";a.length>=3&&(/[._\-0-9]/.test(a)||a.length>=6)&&s.add(a)}};return n(fe(["config","--global","user.name"]),fe(["config","--global","user.email"])),n("",fe(["config","user.email"],r)),J={names:[...e],emails:[...t],handles:[...s]},J}var Se=r=>r.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");function Qe(r=Fs()){let e=[];for(let t of r.emails)e.push({category:"OPERATOR",label:"OPERATOR_EMAIL",regex:new RegExp(Se(t),"gi")});for(let t of r.names)e.push({category:"OPERATOR",label:"OPERATOR_NAME",regex:new RegExp(`\\b${Se(t)}\\b`,"gi")});for(let t of r.handles)e.push({category:"OPERATOR",label:"OPERATOR_HANDLE",regex:new RegExp(`\\b${Se(t)}\\b`,"gi")});return e}at();function z(r,e,t){return e.regex.lastIndex=0,r.replace(e.regex,(...s)=>{let n=s[0],o=e.replace?e.replace(...s):`[REDACTED:${e.label}]`;return o!==n&&(t[e.label]=(t[e.label]??0)+1),o})}function G(r,e={}){if(typeof r!="string"||r.length===0)return{text:typeof r=="string"?r:"",counts:{}};let t=it(e.project);if(!t.enabled)return{text:r,counts:{}};let s={},n=r;try{if(!t.disabled.has("OPERATOR"))for(let o of Qe())n=z(n,o,s);for(let o of[...ze,...t.localePatterns])t.disabled.has(o.category)||(n=z(n,o,s));t.disabled.has("EMAIL")||(Te.lastIndex=0,n=n.replace(Te,o=>ot(o,t.emailAllowlist)?o:(s.EMAIL=(s.EMAIL??0)+1,"[REDACTED:EMAIL]"))),t.disabled.has("PHONE")||(n=z(n,{category:"PHONE",label:"PHONE",regex:qe,replace:Ve},s)),t.disabled.has("POSTAL")||(n=z(n,{category:"POSTAL",label:"POSTAL_ADDRESS",regex:Je},s))}catch{return{text:"[REDACTED:ERROR]",counts:{ERROR:1}}}return{text:n,counts:s}}function _t(r,e,t){Object.values(t).reduce((n,o)=>n+o,0)>0&&l.info("REDACT","redaction applied",{surface:r,project:e,counts:t})}function D(r,e={}){let{text:t,counts:s}=G(r,{project:e.project});return _t(e.surface??"persist",e.project,s),t}function j(r,e,t={}){let s={},n={...r},o={project:t.project};for(let i of e){let a=n[i];if(typeof a=="string"){let{text:_,counts:d}=G(a,o);n[i]=_;for(let[E,u]of Object.entries(d))s[E]=(s[E]??0)+u}else Array.isArray(a)&&(n[i]=a.map(_=>{if(typeof _!="string")return _;let{text:d,counts:E}=G(_,o);for(let[u,T]of Object.entries(E))s[u]=(s[u]??0)+T;return d}))}return _t(t.surface??"persist",t.project,s),n}function Hs(r,e){return{customTitle:r,platformSource:e?w(e):void 0}}var Z=class{db;constructor(e=we){e instanceof he.Database?this.db=e:(e!==":memory:"&&Fe(O),this.db=new he.Database(e),this.db.run("PRAGMA journal_mode = WAL"),this.db.run("PRAGMA synchronous = NORMAL"),this.db.run("PRAGMA foreign_keys = ON"),this.db.run("PRAGMA journal_size_limit = 4194304")),this.initializeSchema(),this.ensureWorkerPortColumn(),this.ensurePromptTrackingColumns(),this.removeSessionSummariesUniqueConstraint(),this.addObservationHierarchicalFields(),this.makeObservationsTextNullable(),this.createUserPromptsTable(),this.ensureDiscoveryTokensColumn(),this.createPendingMessagesTable(),this.renameSessionIdColumns(),this.repairSessionIdColumnRename(),this.addFailedAtEpochColumn(),this.addOnUpdateCascadeToForeignKeys(),this.addObservationContentHashColumn(),this.addSessionCustomTitleColumn(),this.addSessionPlatformSourceColumn(),this.addObservationModelColumns(),this.ensureMergedIntoProjectColumns(),this.addObservationSubagentColumns(),this.addObservationsUniqueContentHashIndex(),this.addObservationsMetadataColumn(),this.dropDeadPendingMessagesColumns(),this.ensurePendingMessagesToolUseIdColumn(),this.dropWorkerPidColumn()}dropWorkerPidColumn(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(32),s=this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="worker_pid");if(!(e&&!s)){if(s)try{this.db.run("DROP INDEX IF EXISTS idx_pending_messages_worker_pid"),this.db.run("ALTER TABLE pending_messages DROP COLUMN worker_pid"),l.debug("DB","Dropped worker_pid column and its index from pending_messages")}catch(n){l.warn("DB","Failed to drop worker_pid column from pending_messages",{},n instanceof Error?n:new Error(String(n)));return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(32,new Date().toISOString())}}dropDeadPendingMessagesColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(31),t=this.db.query("PRAGMA table_info(pending_messages)").all(),s=new Set(t.map(i=>i.name)),o=["retry_count","failed_at_epoch","completed_at_epoch"].filter(i=>s.has(i));if(!(e&&o.length===0)){if(o.length>0){this.db.run("BEGIN TRANSACTION");try{this.db.run("DELETE FROM pending_messages WHERE status NOT IN ('pending', 'processing')");for(let i of o)this.db.run(`ALTER TABLE pending_messages DROP COLUMN ${i}`),l.debug("DB",`Dropped dead column ${i} from pending_messages`);e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString()),this.db.run("COMMIT")}catch(i){this.db.run("ROLLBACK"),l.warn("DB","Failed to drop dead columns from pending_messages",{},i instanceof Error?i:new Error(String(i)));return}return}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(31,new Date().toISOString())}}initializeSchema(){this.db.run(`
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
    `),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_session ON pending_messages(session_db_id)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_pending_messages_claude_session ON pending_messages(content_session_id)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(16,new Date().toISOString()),l.debug("DB","pending_messages table created successfully")}renameSessionIdColumns(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(17))return;l.debug("DB","Checking session ID columns for semantic clarity rename");let t=0,s=(n,o,i)=>{let a=this.db.query(`PRAGMA table_info(${n})`).all(),_=a.some(E=>E.name===o);return a.some(E=>E.name===i)?!1:_?(this.db.run(`ALTER TABLE ${n} RENAME COLUMN ${o} TO ${i}`),l.debug("DB",`Renamed ${n}.${o} to ${i}`),!0):(l.warn("DB",`Column ${o} not found in ${n}, skipping rename`),!1)};s("sdk_sessions","claude_session_id","content_session_id")&&t++,s("sdk_sessions","sdk_session_id","memory_session_id")&&t++,s("pending_messages","claude_session_id","content_session_id")&&t++,s("observations","sdk_session_id","memory_session_id")&&t++,s("session_summaries","sdk_session_id","memory_session_id")&&t++,s("user_prompts","claude_session_id","content_session_id")&&t++,this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(17,new Date().toISOString()),t>0?l.debug("DB",`Successfully renamed ${t} session ID columns`):l.debug("DB","No session ID column renames needed (already up to date)")}repairSessionIdColumnRename(){this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(19)||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(19,new Date().toISOString())}addFailedAtEpochColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(20))return;this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="failed_at_epoch")||(this.db.run("ALTER TABLE pending_messages ADD COLUMN failed_at_epoch INTEGER"),l.debug("DB","Added failed_at_epoch column to pending_messages table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(20,new Date().toISOString())}addOnUpdateCascadeToForeignKeys(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(21))return;l.debug("DB","Adding ON UPDATE CASCADE to FK constraints on observations and session_summaries"),this.db.run("PRAGMA foreign_keys = OFF"),this.db.run("BEGIN TRANSACTION"),this.db.run("DROP TRIGGER IF EXISTS observations_ai"),this.db.run("DROP TRIGGER IF EXISTS observations_ad"),this.db.run("DROP TRIGGER IF EXISTS observations_au"),this.db.run("DROP TABLE IF EXISTS observations_new");let t=this.db.query("PRAGMA table_info(observations)").all(),s=t.some(S=>S.name==="metadata"),n=t.some(S=>S.name==="content_hash"),o=s?`,
        metadata TEXT`:"",i=s?", metadata":"",a=n?`,
        content_hash TEXT`:"",_=n?", content_hash":"",d=`
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
    `,E=`
      INSERT INTO observations_new
      SELECT id, memory_session_id, project, text, type, title, subtitle, facts,
             narrative, concepts, files_read, files_modified, prompt_number,
             discovery_tokens, created_at, created_at_epoch${i}${_}
      FROM observations
    `,u=`
      CREATE INDEX idx_observations_sdk_session ON observations(memory_session_id);
      CREATE INDEX idx_observations_project ON observations(project);
      CREATE INDEX idx_observations_type ON observations(type);
      CREATE INDEX idx_observations_created ON observations(created_at_epoch DESC);
    `,T=`
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
    `,f=`
      INSERT INTO session_summaries_new
      SELECT id, memory_session_id, project, request, investigated, learned,
             completed, next_steps, files_read, files_edited, notes,
             prompt_number, discovery_tokens, created_at, created_at_epoch
      FROM session_summaries
    `,b=`
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
    `;try{this.recreateObservationsWithCascade(d,E,u,T),this.recreateSessionSummariesWithCascade(m,f,b,p),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(21,new Date().toISOString()),this.db.run("COMMIT"),this.db.run("PRAGMA foreign_keys = ON"),l.debug("DB","Successfully added ON UPDATE CASCADE to FK constraints")}catch(S){throw this.db.run("ROLLBACK"),this.db.run("PRAGMA foreign_keys = ON"),S instanceof Error?S:new Error(String(S))}}recreateObservationsWithCascade(e,t,s,n){this.db.run(e),this.db.run(t),this.db.run("DROP TABLE observations"),this.db.run("ALTER TABLE observations_new RENAME TO observations"),this.db.run(s),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run(n)}recreateSessionSummariesWithCascade(e,t,s,n){this.db.run(e),this.db.run(t),this.db.run("DROP TABLE session_summaries"),this.db.run("ALTER TABLE session_summaries_new RENAME TO session_summaries"),this.db.run(s),this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='session_summaries_fts'").all().length>0&&this.db.run(n)}addObservationContentHashColumn(){if(this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="content_hash")){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString());return}this.db.run("ALTER TABLE observations ADD COLUMN content_hash TEXT"),this.db.run("UPDATE observations SET content_hash = substr(hex(randomblob(8)), 1, 16) WHERE content_hash IS NULL"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_content_hash ON observations(content_hash, created_at_epoch)"),l.debug("DB","Added content_hash column to observations table with backfill and index"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(22,new Date().toISOString())}addSessionCustomTitleColumn(){if(this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(23))return;this.db.query("PRAGMA table_info(sdk_sessions)").all().some(n=>n.name==="custom_title")||(this.db.run("ALTER TABLE sdk_sessions ADD COLUMN custom_title TEXT"),l.debug("DB","Added custom_title column to sdk_sessions table")),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(23,new Date().toISOString())}addSessionPlatformSourceColumn(){let t=this.db.query("PRAGMA table_info(sdk_sessions)").all().some(i=>i.name==="platform_source"),n=this.db.query("PRAGMA index_list(sdk_sessions)").all().some(i=>i.name==="idx_sdk_sessions_platform_source");this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(24)&&t&&n||(t||(this.db.run(`ALTER TABLE sdk_sessions ADD COLUMN platform_source TEXT NOT NULL DEFAULT '${h}'`),l.debug("DB","Added platform_source column to sdk_sessions table")),this.db.run(`
      UPDATE sdk_sessions
      SET platform_source = '${h}'
      WHERE platform_source IS NULL OR platform_source = ''
    `),n||this.db.run("CREATE INDEX IF NOT EXISTS idx_sdk_sessions_platform_source ON sdk_sessions(platform_source)"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(24,new Date().toISOString()))}addObservationModelColumns(){let e=this.db.query("PRAGMA table_info(observations)").all(),t=e.some(n=>n.name==="generated_by_model"),s=e.some(n=>n.name==="relevance_count");t&&s||(t||this.db.run("ALTER TABLE observations ADD COLUMN generated_by_model TEXT"),s||this.db.run("ALTER TABLE observations ADD COLUMN relevance_count INTEGER DEFAULT 0"),this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(26,new Date().toISOString()))}ensureMergedIntoProjectColumns(){this.db.query("PRAGMA table_info(observations)").all().some(s=>s.name==="merged_into_project")||this.db.run("ALTER TABLE observations ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_merged_into ON observations(merged_into_project)"),this.db.query("PRAGMA table_info(session_summaries)").all().some(s=>s.name==="merged_into_project")||this.db.run("ALTER TABLE session_summaries ADD COLUMN merged_into_project TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_summaries_merged_into ON session_summaries(merged_into_project)")}addObservationSubagentColumns(){let e=this.db.prepare("SELECT version FROM schema_versions WHERE version = ?").get(27),t=this.db.query("PRAGMA table_info(observations)").all(),s=t.some(i=>i.name==="agent_type"),n=t.some(i=>i.name==="agent_id");s||this.db.run("ALTER TABLE observations ADD COLUMN agent_type TEXT"),n||this.db.run("ALTER TABLE observations ADD COLUMN agent_id TEXT"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_type ON observations(agent_type)"),this.db.run("CREATE INDEX IF NOT EXISTS idx_observations_agent_id ON observations(agent_id)");let o=this.db.query("PRAGMA table_info(pending_messages)").all();if(o.length>0){let i=o.some(_=>_.name==="agent_type"),a=o.some(_=>_.name==="agent_id");i||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_type TEXT"),a||this.db.run("ALTER TABLE pending_messages ADD COLUMN agent_id TEXT")}e||this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(27,new Date().toISOString())}ensurePendingMessagesToolUseIdColumn(){if(this.db.query("SELECT name FROM sqlite_master WHERE type='table' AND name='pending_messages'").all().length===0){this.db.prepare("INSERT OR IGNORE INTO schema_versions (version, applied_at) VALUES (?, ?)").run(28,new Date().toISOString());return}this.db.query("PRAGMA table_info(pending_messages)").all().some(n=>n.name==="tool_use_id")||this.db.run("ALTER TABLE pending_messages ADD COLUMN tool_use_id TEXT"),this.db.run("BEGIN TRANSACTION");try{this.db.run(`
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
    `).all(e)}getAllProjects(e){let t=e?w(e):void 0,s=`
      SELECT DISTINCT project
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
    `,n=[ue];return t&&(s+=" AND COALESCE(platform_source, ?) = ?",n.push(h,t)),s+=" ORDER BY project ASC",this.db.prepare(s).all(...n).map(i=>i.project)}getProjectCatalog(){let e=this.db.prepare(`
      SELECT
        COALESCE(platform_source, '${h}') as platform_source,
        project,
        MAX(started_at_epoch) as latest_epoch
      FROM sdk_sessions
      WHERE project IS NOT NULL AND project != ''
        AND project != ?
      GROUP BY COALESCE(platform_source, '${h}'), project
      ORDER BY latest_epoch DESC
    `).all(ue),t=[],s=new Set,n={};for(let i of e){let a=w(i.platform_source);n[a]||(n[a]=[]),n[a].includes(i.project)||n[a].push(i.project),s.has(i.project)||(s.add(i.project),t.push(i.project))}let o=Ge(Object.keys(n));return{projects:t,sources:o,projectsBySource:Object.fromEntries(o.map(i=>[i,n[i]||[]]))}}getLatestUserPrompt(e){return this.db.prepare(`
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
    `).get(e)}findRecentDuplicateUserPrompt(e,t,s){return je(this.db,e,q(t),s)}getRecentSessionsWithStatus(e,t=3){return this.db.prepare(`
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
    `).get(e)||null}getObservationsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o,type:i,concepts:a,files:_}=t,d=s==="relevance",E=d?"":`ORDER BY created_at_epoch ${s==="date_asc"?"ASC":"DESC"}`,u=n?`LIMIT ${n}`:"",T=e.map(()=>"?").join(","),m=[...e],f=[];if(o&&(f.push("project = ?"),m.push(o)),i)if(Array.isArray(i)){let A=i.map(()=>"?").join(",");f.push(`type IN (${A})`),m.push(...i)}else f.push("type = ?"),m.push(i);if(a){let A=Array.isArray(a)?a:[a],y=A.map(()=>"EXISTS (SELECT 1 FROM json_each(concepts) WHERE value = ?)");m.push(...A),f.push(`(${y.join(" OR ")})`)}if(_){let A=Array.isArray(_)?_:[_],y=A.map(()=>"(EXISTS (SELECT 1 FROM json_each(files_read) WHERE value LIKE ?) OR EXISTS (SELECT 1 FROM json_each(files_modified) WHERE value LIKE ?))");A.forEach(ye=>{m.push(`%${ye}%`,`%${ye}%`)}),f.push(`(${y.join(" OR ")})`)}let b=f.length>0?`WHERE id IN (${T}) AND ${f.join(" AND ")}`:`WHERE id IN (${T})`,S=this.db.prepare(`
      SELECT *
      FROM observations
      ${b}
      ${E}
      ${u}
    `).all(...m);if(!d)return S;let R=new Map(S.map(A=>[A.id,A]));return e.map(A=>R.get(A)).filter(A=>!!A)}getSummaryForSession(e){return this.db.prepare(`
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
    `).all(e),n=new Set,o=new Set;for(let i of s)me(i.files_read).forEach(a=>n.add(a)),me(i.files_modified).forEach(a=>o.add(a));return{filesRead:Array.from(n),filesModified:Array.from(o)}}getSessionById(e){return this.db.prepare(`
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
    `).get(e).count}createSDKSession(e,t,s,n,o){let i=new Date,a=i.getTime(),_=Hs(n,o),d=_.platformSource??h,E=D(q(s),{project:t,surface:"sqlite"}),u=_.customTitle?D(_.customTitle,{project:t,surface:"sqlite"}):_.customTitle,T=this.db.prepare(`
      SELECT id, platform_source FROM sdk_sessions WHERE content_session_id = ?
    `).get(e);if(T){if(t&&this.db.prepare(`
          UPDATE sdk_sessions SET project = ?
          WHERE content_session_id = ? AND (project IS NULL OR project = '')
        `).run(t,e),u&&this.db.prepare(`
          UPDATE sdk_sessions SET custom_title = ?
          WHERE content_session_id = ? AND custom_title IS NULL
        `).run(u,e),_.platformSource){let f=T.platform_source?.trim()?w(T.platform_source):void 0;if(!f)this.db.prepare(`
            UPDATE sdk_sessions SET platform_source = ?
            WHERE content_session_id = ?
              AND COALESCE(platform_source, '') = ''
          `).run(_.platformSource,e);else if(f!==_.platformSource)throw new Error(`Platform source conflict for session ${e}: existing=${f}, received=${_.platformSource}`)}return T.id}return this.db.prepare(`
      INSERT INTO sdk_sessions
      (content_session_id, memory_session_id, project, platform_source, user_prompt, custom_title, started_at, started_at_epoch, status)
      VALUES (?, NULL, ?, ?, ?, ?, ?, ?, 'active')
    `).run(e,t,d,E,u||null,i.toISOString(),a),this.db.prepare("SELECT id FROM sdk_sessions WHERE content_session_id = ?").get(e).id}saveUserPrompt(e,t,s){let n=new Date,o=n.getTime(),i=D(q(s),{surface:"sqlite"});return this.db.prepare(`
      INSERT INTO user_prompts
      (content_session_id, prompt_number, prompt_text, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?)
    `).run(e,t,i,n.toISOString(),o).lastInsertRowid}getUserPrompt(e,t){return this.db.prepare(`
      SELECT prompt_text
      FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
      LIMIT 1
    `).get(e,t)?.prompt_text??null}storeObservation(e,t,s,n,o=0,i,a){let _=i??Date.now(),d=new Date(_).toISOString(),E=j(s,["title","subtitle","narrative","facts","concepts"],{project:t,surface:"sqlite"}),u=pe(e,E.title,E.narrative),m=this.db.prepare(`
      INSERT INTO observations
      (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
       files_read, files_modified, prompt_number, discovery_tokens, agent_type, agent_id, content_hash, created_at, created_at_epoch,
       generated_by_model, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(memory_session_id, content_hash) DO NOTHING
      RETURNING id, created_at_epoch
    `).get(e,t,E.type,E.title,E.subtitle,JSON.stringify(E.facts),E.narrative,JSON.stringify(E.concepts),JSON.stringify(E.files_read),JSON.stringify(E.files_modified),n||null,o,s.agent_type??null,s.agent_id??null,u,d,_,a||null,s.metadata??null);if(m)return{id:m.id,createdAtEpoch:m.created_at_epoch};let f=this.db.prepare("SELECT id, created_at_epoch FROM observations WHERE memory_session_id = ? AND content_hash = ?").get(e,u);if(!f)throw new Error(`storeObservation: ON CONFLICT without existing row for content_hash=${u}`);return{id:f.id,createdAtEpoch:f.created_at_epoch}}storeSummary(e,t,s,n,o=0,i){let a=i??Date.now(),_=new Date(a).toISOString(),d=j(s,["request","investigated","learned","completed","next_steps","notes"],{project:t,surface:"sqlite"}),u=this.db.prepare(`
      INSERT INTO session_summaries
      (memory_session_id, project, request, investigated, learned, completed,
       next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(e,t,d.request,d.investigated,d.learned,d.completed,d.next_steps,d.notes,n||null,o,_,a);return{id:Number(u.lastInsertRowid),createdAtEpoch:a}}storeObservations(e,t,s,n,o,i=0,a,_){let d=a??Date.now(),E=new Date(d).toISOString();return this.db.transaction(()=>{let T=[],m=this.db.prepare(`
        INSERT INTO observations
        (memory_session_id, project, type, title, subtitle, facts, narrative, concepts,
         files_read, files_modified, prompt_number, discovery_tokens, agent_type, agent_id, content_hash, created_at, created_at_epoch,
         generated_by_model)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(memory_session_id, content_hash) DO NOTHING
        RETURNING id
      `),f=this.db.prepare("SELECT id FROM observations WHERE memory_session_id = ? AND content_hash = ?");for(let p of s){let S=j(p,["title","subtitle","narrative","facts","concepts"],{project:t,surface:"sqlite"}),R=pe(e,S.title,S.narrative),A=m.get(e,t,S.type,S.title,S.subtitle,JSON.stringify(S.facts),S.narrative,JSON.stringify(S.concepts),JSON.stringify(S.files_read),JSON.stringify(S.files_modified),o||null,i,S.agent_type??null,S.agent_id??null,R,E,d,_||null);if(A){T.push(A.id);continue}let y=f.get(e,R);if(!y)throw new Error(`storeObservations: ON CONFLICT without existing row for content_hash=${R}`);T.push(y.id)}let b=null;if(n){let p=j(n,["request","investigated","learned","completed","next_steps","notes"],{project:t,surface:"sqlite"}),R=this.db.prepare(`
          INSERT INTO session_summaries
          (memory_session_id, project, request, investigated, learned, completed,
           next_steps, notes, prompt_number, discovery_tokens, created_at, created_at_epoch)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(e,t,p.request,p.investigated,p.learned,p.completed,p.next_steps,p.notes,o||null,i,E,d);b=Number(R.lastInsertRowid)}return{observationIds:T,summaryId:b,createdAtEpoch:d}})()}getSessionSummariesByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="relevance",a=i?"":`ORDER BY created_at_epoch ${s==="date_asc"?"ASC":"DESC"}`,_=n?`LIMIT ${n}`:"",d=e.map(()=>"?").join(","),E=[...e],u=o?`WHERE id IN (${d}) AND project = ?`:`WHERE id IN (${d})`;o&&E.push(o);let m=this.db.prepare(`
      SELECT * FROM session_summaries
      ${u}
      ${a}
      ${_}
    `).all(...E);if(!i)return m;let f=new Map(m.map(b=>[b.id,b]));return e.map(b=>f.get(b)).filter(b=>!!b)}getUserPromptsByIds(e,t={}){if(e.length===0)return[];let{orderBy:s="date_desc",limit:n,project:o}=t,i=s==="relevance",a=i?"":`ORDER BY up.created_at_epoch ${s==="date_asc"?"ASC":"DESC"}`,_=n?`LIMIT ${n}`:"",d=e.map(()=>"?").join(","),E=[...e],u=o?"AND s.project = ?":"";o&&E.push(o);let m=this.db.prepare(`
      SELECT
        up.*,
        s.project,
        s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.id IN (${d}) ${u}
      ${a}
      ${_}
    `).all(...E);if(!i)return m;let f=new Map(m.map(b=>[b.id,b]));return e.map(b=>f.get(b)).filter(b=>!!b)}getTimelineAroundTimestamp(e,t=10,s=10,n){return this.getTimelineAroundObservation(null,e,t,s,n)}getTimelineAroundObservation(e,t,s=10,n=10,o){let i=o?"AND project = ?":"",a=o?[o]:[],_,d;if(e!==null){let p=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id <= ? ${i}
        ORDER BY id DESC
        LIMIT ?
      `,S=`
        SELECT id, created_at_epoch
        FROM observations
        WHERE id >= ? ${i}
        ORDER BY id ASC
        LIMIT ?
      `;try{let R=this.db.prepare(p).all(e,...a,s+1),A=this.db.prepare(S).all(e,...a,n+1);if(R.length===0&&A.length===0)return{observations:[],sessions:[],prompts:[]};_=R.length>0?R[R.length-1].created_at_epoch:t,d=A.length>0?A[A.length-1].created_at_epoch:t}catch(R){return R instanceof Error?l.error("DB","Error getting boundary observations",{project:o},R):l.error("DB","Error getting boundary observations with non-Error",{},new Error(String(R))),{observations:[],sessions:[],prompts:[]}}}else{let p=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch <= ? ${i}
        ORDER BY created_at_epoch DESC
        LIMIT ?
      `,S=`
        SELECT created_at_epoch
        FROM observations
        WHERE created_at_epoch >= ? ${i}
        ORDER BY created_at_epoch ASC
        LIMIT ?
      `;try{let R=this.db.prepare(p).all(t,...a,s),A=this.db.prepare(S).all(t,...a,n+1);if(R.length===0&&A.length===0)return{observations:[],sessions:[],prompts:[]};_=R.length>0?R[R.length-1].created_at_epoch:t,d=A.length>0?A[A.length-1].created_at_epoch:t}catch(R){return R instanceof Error?l.error("DB","Error getting boundary timestamps",{project:o},R):l.error("DB","Error getting boundary timestamps with non-Error",{},new Error(String(R))),{observations:[],sessions:[],prompts:[]}}}let E=`
      SELECT *
      FROM observations
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,u=`
      SELECT *
      FROM session_summaries
      WHERE created_at_epoch >= ? AND created_at_epoch <= ? ${i}
      ORDER BY created_at_epoch ASC
    `,T=`
      SELECT up.*, s.project, s.memory_session_id
      FROM user_prompts up
      JOIN sdk_sessions s ON up.content_session_id = s.content_session_id
      WHERE up.created_at_epoch >= ? AND up.created_at_epoch <= ? ${i.replace("project","s.project")}
      ORDER BY up.created_at_epoch ASC
    `,m=this.db.prepare(E).all(_,d,...a),f=this.db.prepare(u).all(_,d,...a),b=this.db.prepare(T).all(_,d,...a);return{observations:m,sessions:f.map(p=>({id:p.id,memory_session_id:p.memory_session_id,project:p.project,request:p.request,completed:p.completed,next_steps:p.next_steps,created_at:p.created_at,created_at_epoch:p.created_at_epoch})),prompts:b.map(p=>({id:p.id,content_session_id:p.content_session_id,prompt_number:p.prompt_number,prompt_text:p.prompt_text,project:p.project,created_at:p.created_at,created_at_epoch:p.created_at_epoch}))}}getPromptById(e){return this.db.prepare(`
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
    `).run(e.content_session_id,e.memory_session_id,e.project,w(e.platform_source),D(e.user_prompt,{project:e.project,surface:"sqlite"}),e.started_at,e.started_at_epoch,e.completed_at,e.completed_at_epoch,e.status).lastInsertRowid}}importSessionSummary(e){let t=this.db.prepare("SELECT id FROM session_summaries WHERE memory_session_id = ?").get(e.memory_session_id);if(t)return{imported:!1,id:t.id};let s=this.db.prepare(`
      INSERT INTO session_summaries (
        memory_session_id, project, request, investigated, learned,
        completed, next_steps, files_read, files_edited, notes,
        prompt_number, discovery_tokens, created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),n=i=>typeof i=="string"?D(i,{project:e.project,surface:"sqlite"}):i;return{imported:!0,id:s.run(e.memory_session_id,e.project,n(e.request),n(e.investigated),n(e.learned),n(e.completed),n(e.next_steps),e.files_read,e.files_edited,n(e.notes),e.prompt_number,e.discovery_tokens||0,e.created_at,e.created_at_epoch).lastInsertRowid}}importObservation(e){let t=this.db.prepare(`
      SELECT id FROM observations
      WHERE memory_session_id = ? AND title = ? AND created_at_epoch = ?
    `).get(e.memory_session_id,e.title,e.created_at_epoch);if(t)return{imported:!1,id:t.id};let s=this.db.prepare(`
      INSERT INTO observations (
        memory_session_id, project, text, type, title, subtitle,
        facts, narrative, concepts, files_read, files_modified,
        prompt_number, discovery_tokens, agent_type, agent_id,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `),n=i=>typeof i=="string"?D(i,{project:e.project,surface:"sqlite"}):i;return{imported:!0,id:s.run(e.memory_session_id,e.project,n(e.text),e.type,n(e.title),n(e.subtitle),n(e.facts),n(e.narrative),n(e.concepts),e.files_read,e.files_modified,e.prompt_number,e.discovery_tokens||0,e.agent_type??null,e.agent_id??null,e.created_at,e.created_at_epoch).lastInsertRowid}}rebuildObservationsFTSIndex(){this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='observations_fts'").all().length>0&&this.db.run("INSERT INTO observations_fts(observations_fts) VALUES('rebuild')")}importUserPrompt(e){let t=this.db.prepare(`
      SELECT id FROM user_prompts
      WHERE content_session_id = ? AND prompt_number = ?
    `).get(e.content_session_id,e.prompt_number);return t?{imported:!1,id:t.id}:{imported:!0,id:this.db.prepare(`
      INSERT INTO user_prompts (
        content_session_id, prompt_number, prompt_text,
        created_at, created_at_epoch
      ) VALUES (?, ?, ?, ?, ?)
    `).run(e.content_session_id,e.prompt_number,D(e.prompt_text,{surface:"sqlite"}),e.created_at,e.created_at_epoch).lastInsertRowid}}};I();var Et=require("os"),ct=M(require("path"),1),lt=require("child_process");I();var ee=require("fs"),Q=M(require("path"),1);I();var X={isWorktree:!1,worktreeName:null,parentRepoPath:null,parentProjectName:null};function dt(r){let e=Q.default.join(r,".git"),t;try{t=(0,ee.statSync)(e)}catch(E){return E instanceof Error&&E.code!=="ENOENT"&&l.warn("GIT","Unexpected error checking .git",{error:E instanceof Error?E.message:String(E)}),X}if(!t.isFile())return X;let s;try{s=(0,ee.readFileSync)(e,"utf-8").trim()}catch(E){return l.warn("GIT","Failed to read .git file",{error:E instanceof Error?E.message:String(E)}),X}let n=s.match(/^gitdir:\s*(.+)$/);if(!n)return X;let i=n[1].match(/^(.+)[/\\]\.git[/\\]worktrees[/\\]([^/\\]+)$/);if(!i)return X;let a=i[1],_=Q.default.basename(r),d=Q.default.basename(a);return{isWorktree:!0,worktreeName:_,parentRepoPath:a,parentProjectName:d}}function ut(r){return r==="~"||r.startsWith("~/")?r.replace(/^~/,(0,Et.homedir)()):r}function Gs(r){try{return(0,lt.execFileSync)("git",["rev-parse","--show-toplevel"],{cwd:r,encoding:"utf-8",stdio:["ignore","pipe","ignore"]}).trim()||null}catch{return null}}function js(r){if(!r||r.trim()==="")return l.warn("PROJECT_NAME","Empty cwd provided, using fallback",{cwd:r}),"unknown-project";let e=ut(r),s=Gs(e)??e,n=ct.default.basename(s);if(n===""){if(process.platform==="win32"){let i=r.match(/^([A-Z]):\\/i);if(i){let _=`drive-${i[1].toUpperCase()}`;return l.info("PROJECT_NAME","Drive root detected",{cwd:r,projectName:_}),_}}return l.warn("PROJECT_NAME","Root directory detected, using fallback",{cwd:r}),"unknown-project"}return n}function pt(r){let e=js(r);if(!r)return{primary:e,parent:null,isWorktree:!1,allProjects:[e]};let t=ut(r),s=dt(t);if(s.isWorktree&&s.parentProjectName){let n=`${s.parentProjectName}/${e}`;return{primary:n,parent:s.parentProjectName,isWorktree:!0,allProjects:[s.parentProjectName,n]}}return{primary:e,parent:null,isWorktree:!1,allProjects:[e]}}be();U();var B=require("fs"),te=require("path");I();U();var C=class r{static instance=null;activeMode=null;modesDir;constructor(){let e=$e(),t=[...process.env.CLAUDE_MEM_MODES_DIR?[process.env.CLAUDE_MEM_MODES_DIR]:[],(0,te.join)(e,"modes"),(0,te.join)(e,"..","plugin","modes")],s=t.find(n=>(0,B.existsSync)(n));this.modesDir=s||t[0]}static getInstance(){return r.instance||(r.instance=new r),r.instance}parseInheritance(e){let t=e.split("--");if(t.length===1)return{hasParent:!1,parentId:"",overrideId:""};if(t.length>2)throw new Error(`Invalid mode inheritance: ${e}. Only one level of inheritance supported (parent--override)`);return{hasParent:!0,parentId:t[0],overrideId:e}}isPlainObject(e){return e!==null&&typeof e=="object"&&!Array.isArray(e)}deepMerge(e,t){let s={...e};for(let n in t){let o=t[n],i=e[n];this.isPlainObject(o)&&this.isPlainObject(i)?s[n]=this.deepMerge(i,o):s[n]=o}return s}loadModeFile(e){let t=(0,te.join)(this.modesDir,`${e}.json`);if(!(0,B.existsSync)(t))throw new Error(`Mode file not found: ${t}`);let s=(0,B.readFileSync)(t,"utf-8");return JSON.parse(s)}loadMode(e){let t=this.parseInheritance(e);if(!t.hasParent)try{let _=this.loadModeFile(e);return this.activeMode=_,l.debug("SYSTEM",`Loaded mode: ${_.name} (${e})`,void 0,{types:_.observation_types.map(d=>d.id),concepts:_.observation_concepts.map(d=>d.id)}),_}catch(_){if(_ instanceof Error?l.warn("WORKER",`Mode file not found: ${e}, falling back to 'code'`,{message:_.message}):l.warn("WORKER",`Mode file not found: ${e}, falling back to 'code'`,{error:String(_)}),e==="code")throw new Error("Critical: code.json mode file missing");return this.loadMode("code")}let{parentId:s,overrideId:n}=t,o;try{o=this.loadMode(s)}catch(_){_ instanceof Error?l.warn("WORKER",`Parent mode '${s}' not found for ${e}, falling back to 'code'`,{message:_.message}):l.warn("WORKER",`Parent mode '${s}' not found for ${e}, falling back to 'code'`,{error:String(_)}),o=this.loadMode("code")}let i;try{i=this.loadModeFile(n),l.debug("SYSTEM",`Loaded override file: ${n} for parent ${s}`)}catch(_){return _ instanceof Error?l.warn("WORKER",`Override file '${n}' not found, using parent mode '${s}' only`,{message:_.message}):l.warn("WORKER",`Override file '${n}' not found, using parent mode '${s}' only`,{error:String(_)}),this.activeMode=o,o}if(!i)return l.warn("SYSTEM",`Invalid override file: ${n}, using parent mode '${s}' only`),this.activeMode=o,o;let a=this.deepMerge(o,i);return this.activeMode=a,l.debug("SYSTEM",`Loaded mode with inheritance: ${a.name} (${e} = ${s} + ${n})`,void 0,{parent:s,override:n,types:a.observation_types.map(_=>_.id),concepts:a.observation_concepts.map(_=>_.id)}),a}getActiveMode(){if(!this.activeMode)throw new Error("No mode loaded. Call loadMode() first.");return this.activeMode}getObservationTypes(){return this.getActiveMode().observation_types}getTypeIcon(e){return this.getObservationTypes().find(s=>s.id===e)?.emoji||"\u{1F4DD}"}getWorkEmoji(e){return this.getObservationTypes().find(s=>s.id===e)?.work_emoji||"\u{1F4DD}"}};function mt(){let r=$.settings(),e=k.loadFromFile(r),t=C.getInstance().getActiveMode(),s=new Set(t.observation_types.map(o=>o.id)),n=new Set(t.observation_concepts.map(o=>o.id));return{totalObservationCount:parseInt(e.CLAUDE_MEM_CONTEXT_OBSERVATIONS,10),fullObservationCount:parseInt(e.CLAUDE_MEM_CONTEXT_FULL_COUNT,10),sessionCount:parseInt(e.CLAUDE_MEM_CONTEXT_SESSION_COUNT,10),showReadTokens:e.CLAUDE_MEM_CONTEXT_SHOW_READ_TOKENS==="true",showWorkTokens:e.CLAUDE_MEM_CONTEXT_SHOW_WORK_TOKENS==="true",showSavingsAmount:e.CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_AMOUNT==="true",showSavingsPercent:e.CLAUDE_MEM_CONTEXT_SHOW_SAVINGS_PERCENT==="true",observationTypes:s,observationConcepts:n,fullObservationField:e.CLAUDE_MEM_CONTEXT_FULL_FIELD,showLastSummary:e.CLAUDE_MEM_CONTEXT_SHOW_LAST_SUMMARY==="true",showLastMessage:e.CLAUDE_MEM_CONTEXT_SHOW_LAST_MESSAGE==="true"}}var c={reset:"\x1B[0m",bright:"\x1B[1m",dim:"\x1B[2m",cyan:"\x1B[36m",green:"\x1B[32m",yellow:"\x1B[33m",blue:"\x1B[34m",magenta:"\x1B[35m",gray:"\x1B[90m",red:"\x1B[31m"},gt=4,Ce=1;function Tt(r){let e=(r.title?.length||0)+(r.subtitle?.length||0)+(r.narrative?.length||0)+JSON.stringify(r.facts||[]).length;return Math.ceil(e/gt)}function Ie(r){let e=r.length,t=r.reduce((i,a)=>i+Tt(a),0),s=r.reduce((i,a)=>i+(a.discovery_tokens||0),0),n=s-t,o=s>0?Math.round(n/s*100):0;return{totalObservations:e,totalReadTokens:t,totalDiscoveryTokens:s,savings:n,savingsPercent:o}}function Xs(r){return C.getInstance().getWorkEmoji(r)}function W(r,e){let t=Tt(r),s=r.discovery_tokens||0,n=Xs(r.type),o=s>0?`${n} ${s.toLocaleString()}`:"-";return{readTokens:t,discoveryTokens:s,discoveryDisplay:o,workEmoji:n}}function F(r){return r.showReadTokens||r.showWorkTokens||r.showSavingsAmount||r.showSavingsPercent}var ft=M(require("path"),1),se=require("fs");I();U();function St(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(",");return r.db.prepare(`
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
  `).all(e,e,...s,...o,t.totalObservationCount)}function At(r,e,t){return r.db.prepare(`
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
  `).all(e,e,t.sessionCount+Ce)}function Rt(r,e,t){let s=Array.from(t.observationTypes),n=s.map(()=>"?").join(","),o=Array.from(t.observationConcepts),i=o.map(()=>"?").join(","),a=e.map(()=>"?").join(",");return r.db.prepare(`
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
  `).all(...e,...e,...s,...o,t.totalObservationCount)}function bt(r,e,t){let s=e.map(()=>"?").join(",");return r.db.prepare(`
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
  `).all(...e,...e,t.sessionCount+Ce)}function Bs(r){return r.replace(/[/.]/g,"-")}function Ws(r){if(!r.includes('"type":"assistant"'))return null;let e=JSON.parse(r);if(e.type==="assistant"&&e.message?.content&&Array.isArray(e.message.content)){let t="";for(let s of e.message.content)s.type==="text"&&(t+=s.text);if(t=t.replace(Ke,"").trim(),t)return t}return null}function Ks(r){for(let e=r.length-1;e>=0;e--)try{let t=Ws(r[e]);if(t)return t}catch(t){t instanceof Error?l.debug("WORKER","Skipping malformed transcript line",{lineIndex:e},t):l.debug("WORKER","Skipping malformed transcript line",{lineIndex:e,error:String(t)});continue}return""}function Ys(r){try{if(!(0,se.existsSync)(r))return{assistantMessage:""};let e=(0,se.readFileSync)(r,"utf-8").trim();if(!e)return{assistantMessage:""};let t=e.split(`
`).filter(n=>n.trim());return{assistantMessage:Ks(t)}}catch(e){return e instanceof Error?l.failure("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r},e):l.warn("WORKER","Failed to extract prior messages from transcript",{transcriptPath:r,error:String(e)}),{assistantMessage:""}}}function Ot(r,e,t,s){if(!e.showLastMessage||r.length===0)return{assistantMessage:""};let n=r.find(_=>_.memory_session_id!==t);if(!n)return{assistantMessage:""};let o=n.memory_session_id,i=Bs(s),a=ft.default.join(P,"projects",i,`${o}.jsonl`);return Ys(a)}function ht(r,e){let t=e[0]?.id;return r.map((s,n)=>{let o=n===0?null:e[n+1];return{...s,displayEpoch:o?o.created_at_epoch:s.created_at_epoch,displayTime:o?o.created_at:s.created_at,shouldShowLink:s.id!==t}})}function Ct(r,e){let t=[...r.map(s=>({type:"observation",data:s})),...e.map(s=>({type:"summary",data:s}))];return t.sort((s,n)=>{let o=s.type==="observation"?s.data.created_at_epoch:s.data.displayEpoch,i=n.type==="observation"?n.data.created_at_epoch:n.data.displayEpoch;return o-i}),t}function It(r,e){return new Set(r.slice(0,e).map(t=>t.id))}function Nt(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function Lt(r){return[`# [${r}] recent context, ${Nt()}`,""]}function Dt(){return[`Legend: \u{1F3AF}session ${C.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji}${t.id}`).join(" ")}`,"Format: ID TIME TYPE TITLE","Fetch details: get_observations([IDs]) | Search: mem-search skill",""]}function re(r,e){let t=[],s=[`${r.totalObservations} obs (${r.totalReadTokens.toLocaleString()}t read)`,`${r.totalDiscoveryTokens.toLocaleString()}t work`];return r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)&&(e.showSavingsPercent?s.push(`${r.savingsPercent}% savings`):e.showSavingsAmount&&s.push(`${r.savings.toLocaleString()}t saved`)),t.push(`Stats: ${s.join(" | ")}`),t.push(""),t}function Mt(r){return[`### ${r}`]}function yt(r){return r.toLowerCase().replace(" am","a").replace(" pm","p")}function vt(r,e,t){let s=r.title||"Untitled",n=C.getInstance().getTypeIcon(r.type),o=e?yt(e):'"';return`${r.id} ${o} ${n} ${s}`}function Ut(r,e,t,s){let n=[],o=r.title||"Untitled",i=C.getInstance().getTypeIcon(r.type),a=e?yt(e):'"',{readTokens:_,discoveryDisplay:d}=W(r,s);n.push(`**${r.id}** ${a} ${i} **${o}**`),t&&n.push(t);let E=[];return s.showReadTokens&&E.push(`~${_}t`),s.showWorkTokens&&E.push(d),E.length>0&&n.push(E.join(" ")),n.push(""),n}function xt(r,e){return[`S${r.id} ${r.request||"Session started"} (${e})`]}function K(r,e){return e?[`**${r}**: ${e}`,""]:[]}function Pt(r){return r.assistantMessage?["","---","","**Previously**","",`A: ${r.assistantMessage}`,""]:[]}function wt(r,e){return["",`Access ${Math.round(r/1e3)}k tokens of past work via get_observations([IDs]) or mem-search skill.`]}function kt(r){return`# [${r}] recent context, ${Nt()}

No previous sessions found.`}function Ft(){let r=new Date,e=r.toLocaleDateString("en-CA"),t=r.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0}).toLowerCase().replace(" ",""),s=r.toLocaleTimeString("en-US",{timeZoneName:"short"}).split(" ").pop();return`${e} ${t} ${s}`}function $t(r){return["",`${c.bright}${c.cyan}[${r}] recent context, ${Ft()}${c.reset}`,`${c.gray}${"\u2500".repeat(60)}${c.reset}`,""]}function Ht(){let e=C.getInstance().getActiveMode().observation_types.map(t=>`${t.emoji} ${t.id}`).join(" | ");return[`${c.dim}Legend: session-request | ${e}${c.reset}`,""]}function Gt(){return[`${c.bright}Column Key${c.reset}`,`${c.dim}  Read: Tokens to read this observation (cost to learn it now)${c.reset}`,`${c.dim}  Work: Tokens spent on work that produced this record ( research, building, deciding)${c.reset}`,""]}function jt(){return[`${c.dim}Context Index: This semantic index (titles, types, files, tokens) is usually sufficient to understand past work.${c.reset}`,"",`${c.dim}When you need implementation details, rationale, or debugging context:${c.reset}`,`${c.dim}  - Fetch by ID: get_observations([IDs]) for observations visible in this index${c.reset}`,`${c.dim}  - Search history: Use the mem-search skill for past decisions, bugs, and deeper research${c.reset}`,`${c.dim}  - Trust this index over re-reading code for past decisions and learnings${c.reset}`,""]}function oe(r,e){let t=[];if(t.push(`${c.bright}${c.cyan}Context Economics${c.reset}`),t.push(`${c.dim}  Loading: ${r.totalObservations} observations (${r.totalReadTokens.toLocaleString()} tokens to read)${c.reset}`),t.push(`${c.dim}  Work investment: ${r.totalDiscoveryTokens.toLocaleString()} tokens spent on research, building, and decisions${c.reset}`),r.totalDiscoveryTokens>0&&(e.showSavingsAmount||e.showSavingsPercent)){let s="  Your savings: ";e.showSavingsAmount&&e.showSavingsPercent?s+=`${r.savings.toLocaleString()} tokens (${r.savingsPercent}% reduction from reuse)`:e.showSavingsAmount?s+=`${r.savings.toLocaleString()} tokens`:s+=`${r.savingsPercent}% reduction from reuse`,t.push(`${c.green}${s}${c.reset}`)}return t.push(""),t}function Xt(r){return[`${c.bright}${c.cyan}${r}${c.reset}`,""]}function Bt(r){return[`${c.dim}${r}${c.reset}`]}function Wt(r,e,t,s){let n=r.title||"Untitled",o=C.getInstance().getTypeIcon(r.type),{readTokens:i,discoveryTokens:a,workEmoji:_}=W(r,s),d=t?`${c.dim}${e}${c.reset}`:" ".repeat(e.length),E=s.showReadTokens&&i>0?`${c.dim}(~${i}t)${c.reset}`:"",u=s.showWorkTokens&&a>0?`${c.dim}(${_} ${a.toLocaleString()}t)${c.reset}`:"";return`  ${c.dim}#${r.id}${c.reset}  ${d}  ${o}  ${n} ${E} ${u}`}function Kt(r,e,t,s,n){let o=[],i=r.title||"Untitled",a=C.getInstance().getTypeIcon(r.type),{readTokens:_,discoveryTokens:d,workEmoji:E}=W(r,n),u=t?`${c.dim}${e}${c.reset}`:" ".repeat(e.length),T=n.showReadTokens&&_>0?`${c.dim}(~${_}t)${c.reset}`:"",m=n.showWorkTokens&&d>0?`${c.dim}(${E} ${d.toLocaleString()}t)${c.reset}`:"";return o.push(`  ${c.dim}#${r.id}${c.reset}  ${u}  ${a}  ${c.bright}${i}${c.reset}`),s&&o.push(`    ${c.dim}${s}${c.reset}`),(T||m)&&o.push(`    ${T} ${m}`),o.push(""),o}function Yt(r,e){let t=`${r.request||"Session started"} (${e})`;return[`${c.yellow}#S${r.id}${c.reset} ${t}`,""]}function Y(r,e,t){return e?[`${t}${r}:${c.reset} ${e}`,""]:[]}function Vt(r){return r.assistantMessage?["","---","",`${c.bright}${c.magenta}Previously${c.reset}`,"",`${c.dim}A: ${r.assistantMessage}${c.reset}`,""]:[]}function qt(r,e){let t=Math.round(r/1e3);return["",`${c.dim}Access ${t}k tokens of past research & decisions for just ${e.toLocaleString()}t. Use the claude-mem skill to access memories by ID.${c.reset}`]}function Jt(r){return`
${c.bright}${c.cyan}[${r}] recent context, ${Ft()}${c.reset}
${c.gray}${"\u2500".repeat(60)}${c.reset}

${c.dim}No previous sessions found for this project yet.${c.reset}
`}function zt(r,e,t,s){let n=[];return s?n.push(...$t(r)):n.push(...Lt(r)),s?n.push(...Ht()):n.push(...Dt()),s&&(n.push(...Gt()),n.push(...jt())),F(t)&&(s?n.push(...oe(e,t)):n.push(...re(e,t))),n}var Ne=M(require("path"),1);I();function ae(r){if(!r)return[];try{let e=JSON.parse(r);return Array.isArray(e)?e:[]}catch(e){return l.debug("PARSER","Failed to parse JSON array, using empty fallback",{preview:r?.substring(0,50)},e instanceof Error?e:new Error(String(e))),[]}}function Le(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0})}function De(r){return new Date(r).toLocaleString("en-US",{hour:"numeric",minute:"2-digit",hour12:!0})}function Qt(r){return new Date(r).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric"})}function Zt(r,e){return Ne.default.isAbsolute(r)?Ne.default.relative(e,r):r}function es(r,e,t){let s=ae(r);if(s.length>0)return Zt(s[0],e);if(t){let n=ae(t);if(n.length>0)return Zt(n[0],e)}return"General"}function Vs(r){let e=new Map;for(let s of r){let n=s.type==="observation"?s.data.created_at:s.data.displayTime,o=Qt(n);e.has(o)||e.set(o,[]),e.get(o).push(s)}let t=Array.from(e.entries()).sort((s,n)=>{let o=new Date(s[0]).getTime(),i=new Date(n[0]).getTime();return o-i});return new Map(t)}function ts(r,e){return e.fullObservationField==="narrative"?r.narrative:r.facts?ae(r.facts).join(`
`):null}function qs(r,e,t,s){let n=[];n.push(...Mt(r));let o="";for(let i of e)if(i.type==="summary"){let a=i.data,_=Le(a.displayTime);n.push(...xt(a,_))}else{let a=i.data,_=De(a.created_at),E=_!==o?_:"";if(o=_,t.has(a.id)){let T=ts(a,s);n.push(...Ut(a,E,T,s))}else n.push(vt(a,E,s))}return n}function Js(r,e,t,s,n){let o=[];o.push(...Xt(r));let i=null,a="";for(let _ of e)if(_.type==="summary"){i=null,a="";let d=_.data,E=Le(d.displayTime);o.push(...Yt(d,E))}else{let d=_.data,E=es(d.files_modified,n,d.files_read),u=De(d.created_at),T=u!==a;a=u;let m=t.has(d.id);if(E!==i&&(o.push(...Bt(E)),i=E),m){let f=ts(d,s);o.push(...Kt(d,u,T,f,s))}else o.push(Wt(d,u,T,s))}return o.push(""),o}function zs(r,e,t,s,n,o){return o?Js(r,e,t,s,n):qs(r,e,t,s)}function ss(r,e,t,s,n){let o=[],i=Vs(r);for(let[a,_]of i)o.push(...zs(a,_,e,t,s,n));return o}function rs(r,e,t){return!(!r.showLastSummary||!e||!!!(e.investigated||e.learned||e.completed||e.next_steps)||t&&e.created_at_epoch<=t.created_at_epoch)}function ns(r,e){let t=[];return e?(t.push(...Y("Investigated",r.investigated,c.blue)),t.push(...Y("Learned",r.learned,c.yellow)),t.push(...Y("Completed",r.completed,c.green)),t.push(...Y("Next Steps",r.next_steps,c.magenta))):(t.push(...K("Investigated",r.investigated)),t.push(...K("Learned",r.learned)),t.push(...K("Completed",r.completed)),t.push(...K("Next Steps",r.next_steps))),t}function os(r,e){return e?Vt(r):Pt(r)}function is(r,e,t){return!F(e)||r.totalDiscoveryTokens<=0||r.savings<=0?[]:t?qt(r.totalDiscoveryTokens,r.totalReadTokens):wt(r.totalDiscoveryTokens,r.totalReadTokens)}var Zs=as.default.join((0,_s.homedir)(),".claude","plugins","marketplaces","thedotmack","plugin",".install-version");function Qs(){try{return new Z}catch(r){if(r instanceof Error&&r.code==="ERR_DLOPEN_FAILED"){try{(0,ds.unlinkSync)(Zs)}catch(e){e instanceof Error?l.debug("WORKER","Marker file cleanup failed (may not exist)",{},e):l.debug("WORKER","Marker file cleanup failed (may not exist)",{error:String(e)})}return l.error("WORKER","Native module rebuild needed - restart Claude Code to auto-fix"),null}throw r}}function er(r,e){return e?Jt(r):kt(r)}function tr(r,e,t,s,n,o,i,a=!1){let _=[],d=Ie(e);if(a)return F(s)?(i?oe(d,s):re(d,s)).join(`
`).trimEnd():"";_.push(...zt(r,d,s,i));let E=t.slice(0,s.sessionCount),u=ht(E,t),T=Ct(e,u),m=It(e,s.fullObservationCount);_.push(...ss(T,m,s,n,i));let f=t[0],b=e[0];rs(s,f,b)&&_.push(...ns(f,i));let p=Ot(e,s,o,n);return _.push(...os(p,i)),_.push(...is(d,s,i)),_.join(`
`).trimEnd()}var sr=new Set(["bugfix","discovery","decision","refactor"]);function rr(r,e,t){let s=Ie(r),n={bugfix:0,discovery:0,decision:0,refactor:0,other:0},o=new Set,i=Number.POSITIVE_INFINITY;for(let _ of r){let d=sr.has(_.type)?_.type:"other";n[d]++,_.memory_session_id&&o.add(_.memory_session_id),_.created_at_epoch&&_.created_at_epoch<i&&(i=_.created_at_epoch)}let a=Number.isFinite(i)?Math.max(0,Math.floor((Date.now()-i)/864e5)):0;return{observation_count:r.length,session_count:o.size,timeline_depth_days:a,has_session_summary:e.length>0,obs_type_bugfix:n.bugfix,obs_type_discovery:n.discovery,obs_type_decision:n.decision,obs_type_refactor:n.refactor,obs_type_other:n.other,tokens_injected:s.totalReadTokens,tokens_saved_vs_naive:s.savings,search_strategy:t?"full":"timeline"}}async function Me(r,e=!1){let t=mt(),s=r?.cwd??process.cwd(),n=pt(s),o=r?.projects?.length?r.projects:n.allProjects,i=o[o.length-1]??n.primary;r?.full&&(t.totalObservationCount=999999,t.sessionCount=999999);let a=Qs();if(!a)return{text:"",stats:null};try{let _=o.length>1?Rt(a,o,t):St(a,i,t),d=o.length>1?bt(a,o,t):At(a,i,t);return _.length===0&&d.length===0?{text:er(i,e),stats:null}:{text:tr(i,_,d,t,s,r?.session_id,e,r?.economicsOnly),stats:rr(_,d,!!r?.full)}}finally{a.close()}}async function Es(r,e=!1){return(await Me(r,e)).text}0&&(module.exports={generateContext,generateContextWithStats});

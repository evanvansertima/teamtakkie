#!/usr/bin/env python3
import re, sys
VOID = {'br','img','input','hr','meta','link','area','base','col','embed','source','track','wbr'}
def controleer(code):
    n=len(code); fouten=[]
    def regel(p): return code.count('\n',0,p)+1
    def string(i):
        q=code[i]; i+=1
        while i<n:
            if code[i]=='\\': i+=2; continue
            if code[i]==q: return i+1
            if q=='`' and code[i]=='$' and i+1<n and code[i+1]=='{': i=js(i+1,True); continue
            i+=1
        return i
    def js(i, expressie):
        diepte=0
        if expressie: diepte=1; i+=1
        while i<n:
            c=code[i]
            if c in '\'"`': i=string(i); continue
            if c=='/' and i+1<n and code[i+1]=='/':
                j=code.find('\n',i); i=n if j<0 else j; continue
            if c=='/' and i+1<n and code[i+1]=='*':
                j=code.find('*/',i); i=n if j<0 else j+2; continue
            if c=='{': diepte+=1; i+=1; continue
            if c=='}':
                diepte-=1; i+=1
                if expressie and diepte==0: return i
                continue
            if c=='<':
                if code[i:i+2]=='<>': i=element(i); continue
                if re.match(r'<[A-Za-z]', code[i:]):
                    k=i-1
                    while k>=0 and code[k] in ' \t\n\r': k-=1
                    if not (k>=0 and (code[k].isalnum() or code[k] in '_$)].')):
                        i=element(i); continue
                i+=1; continue
            i+=1
        return i
    def element(i):
        start=i
        if code[i:i+2]=='<>': return kinderen(i+2,'',start)
        m=re.match(r'<([A-Za-z][\w.\-]*)', code[i:])
        if not m: return i+1
        tag=m.group(1); j=i+m.end(); zelf=False
        while j<n:
            d=code[j]
            if d in '\'"': j=string(j); continue
            if d=='{': j=js(j,True); continue
            if d=='>': zelf = code[j-1]=='/'; j+=1; break
            j+=1
        if zelf or tag.lower() in VOID: return j
        return kinderen(j, tag, start)
    def kinderen(i, tag, start):
        while i<n:
            c=code[i]
            if c=='{': i=js(i,True); continue
            if c=='<':
                if code[i:i+2]=='</':
                    m=re.match(r'</\s*([A-Za-z][\w.\-]*)?\s*>', code[i:])
                    if m:
                        g=m.group(1) or ''
                        if g!=tag: fouten.append("regel %d: </%s> gesloten, maar <%s> stond open (regel %d)"%(regel(i),g or '>',tag or '>',regel(start)))
                        return i+m.end()
                    i+=2; continue
                i=element(i); continue
            i+=1
        fouten.append("regel %d: <%s> nooit gesloten"%(regel(start),tag or '>'))
        return n
    js(0, False)
    return fouten
p = sys.argv[1] if len(sys.argv)>1 else '/sessions/blissful-clever-euler/mnt/outputs/fc-harlingen-app.html'
html=open(p,encoding='utf-8').read()
code=re.search(r'<script type="text/babel">(.*?)</script>',html,re.S).group(1)
for o,c,nm in [('{','}','accolades'),('(',')','haakjes'),('[',']','blokhaken')]:
    d=code.count(o)-code.count(c)
    print(("OK  " if d==0 else "FOUT")+"  %s: %+d"%(nm,d))
f=controleer(code)
print("JSX-parse over",code.count('\n'),"regels")
if not f: print("OK  Alle JSX-elementen correct genest en gesloten")
else:
    for x in f[:20]: print("FOUT",x)
    sys.exit(1)

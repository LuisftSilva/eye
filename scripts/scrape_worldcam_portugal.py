#!/usr/bin/env python3
import json,re,time,unicodedata
from pathlib import Path
from urllib.parse import urljoin,urlparse
import requests
from bs4 import BeautifulSoup
BASE='https://worldcam.eu'
START=f'{BASE}/webcams/europe/portugal'
OUT=Path('data/cameras-worldcam-generated.js')
S=requests.Session(); S.headers['User-Agent']='Mozilla/5.0 EyeBot/1.0 (+https://github.com/LuisftSilva/eye)'
def slug(s):
 s=unicodedata.normalize('NFD',s); s=''.join(c for c in s if unicodedata.category(c)!='Mn'); return re.sub(r'[^a-z0-9]+','-',s.lower()).strip('-')
def get(u):
 r=S.get(u,timeout=30); r.raise_for_status(); return r.text
def detail_links(html):
 soup=BeautifulSoup(html,'html.parser'); out=set()
 for a in soup.select('a[href]'):
  h=urljoin(BASE,a.get('href'))
  if '/webcams/europe/portugal/' in h and not any(x in h for x in ['/list/','/category/']): out.add(h.split('#')[0])
 return out
def next_pages(html):
 soup=BeautifulSoup(html,'html.parser'); out=set()
 for a in soup.select('a[href]'):
  h=urljoin(BASE,a.get('href'))
  if '/webcams/europe/portugal' in h and ('/list/' in h or 'page=' in h): out.add(h.split('#')[0])
 return out
def first(patterns,text):
 for p in patterns:
  m=re.search(p,text,re.I|re.S)
  if m:return m.group(1).strip()
 return ''
def parse(u,html):
 soup=BeautifulSoup(html,'html.parser')
 title=(soup.select_one('h1') or soup.title)
 name=title.get_text(' ',strip=True) if title else u.rsplit('/',1)[-1]
 name=re.sub(r'\s*[-|]\s*WorldCam.*$','',name,flags=re.I)
 lat=first([r'"latitude"\s*:\s*"?(-?\d+(?:\.\d+)?)',r'lat(?:itude)?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)'],html)
 lng=first([r'"longitude"\s*:\s*"?(-?\d+(?:\.\d+)?)',r'lng|lon(?:gitude)?\s*[:=]\s*"?(-?\d+(?:\.\d+)?)'],html)
 provider=''; source=u
 for a in soup.select('a[href]'):
  txt=a.get_text(' ',strip=True).lower(); href=urljoin(u,a.get('href'))
  host=urlparse(href).netloc.lower()
  if host and 'worldcam.eu' not in host and any(k in txt for k in ['provider','website','source','original','site']): provider=a.get_text(' ',strip=True); source=href; break
 if source==u:
  for a in soup.select('a[href]'):
   href=urljoin(u,a.get('href')); host=urlparse(href).netloc.lower()
   if host and 'worldcam.eu' not in host and not any(x in host for x in ['facebook.','twitter.','instagram.','youtube.']): source=href; provider=host.removeprefix('www.'); break
 embed=first([r'<iframe[^>]+src=["\']([^"\']+)',r'(https?://[^"\']+\.m3u8[^"\']*)',r'<video[^>]+src=["\']([^"\']+)'],html)
 city=name.split(' - ')[0].split(' – ')[0].strip()
 category='beach' if re.search(r'praia|beach|surf',name,re.I) else 'weather' if re.search(r'meteo|weather|tempo',name,re.I) else 'port' if re.search(r'marina|porto|harbour',name,re.I) else 'mountain' if re.search(r'serra|mountain|pico',name,re.I) else 'city'
 return {'id':'worldcam-auto-'+slug(name),'name':name,'city':city,'region':'Portugal','country':'Portugal','lat':float(lat) if lat else None,'lng':float(lng) if lng else None,'category':category,'status':'unknown','provider':provider or 'WorldCam Directory','sourceUrl':source,'embedUrl':urljoin(u,embed) if embed else '', 'description':'Webcam portuguesa descoberta automaticamente através da WorldCam; é usada a fonte original quando identificada.','verifiedAt':time.strftime('%Y-%m-%d'),'verification':'provider-page' if source!=u else 'directory-listing','uniqueFeed':source!=u,'tags':['Portugal',city,category,provider or 'WorldCam']}
def main():
 queue=[START]; seen_pages=set(); details=set()
 while queue and len(seen_pages)<30:
  u=queue.pop(0)
  if u in seen_pages: continue
  seen_pages.add(u)
  try: html=get(u)
  except Exception as e: print('page',u,e); continue
  details|=detail_links(html)
  for p in next_pages(html):
   if p not in seen_pages: queue.append(p)
 cams=[]
 for i,u in enumerate(sorted(details)):
  try:
   c=parse(u,get(u))
   if c['lat'] is not None and c['lng'] is not None: cams.append(c)
  except Exception as e: print('detail',u,e)
  time.sleep(.15)
 payload=json.dumps(cams,ensure_ascii=False,separators=(',',':'))
 js='(()=>{const cams='+payload+';const f=window.fetch.bind(window);window.fetch=async(i,n)=>{const r=await f(i,n),u=typeof i==="string"?i:i?.url||"";if(!u.includes("data/cameras.json")||!r.ok)return r;const b=await r.clone().json(),k=new Set(b.map(c=>`${c.name}|${c.city}`.toLowerCase())),x=cams.filter(c=>!k.has(`${c.name}|${c.city}`.toLowerCase()));return new Response(JSON.stringify([...b,...x]),{status:r.status,statusText:r.statusText,headers:{"Content-Type":"application/json"}})};})();\n'
 OUT.write_text(js,encoding='utf-8'); print(f'wrote {len(cams)} cameras')
if __name__=='__main__': main()

# Clock In, Cash Out WY

Free youth-led financial literacy and career readiness program based in Laramie, Wyoming.

**Website:** [clockincashout.org](https://clockincashout.org)  
**Discord:** [discord.gg/7xTDkXy55Q](https://discord.gg/7xTDkXy55Q)  
**Contact:** contact@clockincashout.org  
**Founded:** June 2025 — Glenn D., Carl M., Eliz H.

---

## Structure

```
/
├── index.html               # Main landing page
├── contact.html             # Contact + Get Involved page
├── functions/
│   └── api/
│       └── contact.js       # Cloudflare Pages Function (email via Resend)
└── README.md
```

## Deploy

This site is hosted on **Cloudflare Pages** with the custom domain `clockincashout.org`.

### Environment Variables
Set the following in Cloudflare Pages → Settings → Variables and Secrets:

| Variable | Type | Value |
|---|---|---|
| `RESEND_API_KEY` | Secret | Your Resend API key |

### How it works
- Static HTML served by Cloudflare Pages
- Contact form POSTs to `https://cico-contact.verllegarllego.workers.dev`
- Worker sends notification to `contact@clockincashout.org` via Resend
- Worker sends auto-reply to the form submitter via Resend
- Discord invite links are fetched live from the Discord widget API at runtime

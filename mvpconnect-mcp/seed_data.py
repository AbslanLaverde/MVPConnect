#!/usr/bin/env python3
"""Seed Crescendo DB with test data."""
import bcrypt
from neo4j import GraphDatabase
import uuid
from datetime import datetime

driver = GraphDatabase.driver("bolt://localhost:7687", auth=("neo4j", "changeme"))
driver.verify_connectivity()
print("✓ Connected to Neo4j")

# BCrypt hash for all test passwords (single password for simplicity)
PW = bcrypt.hashpw(b'password123', bcrypt.gensalt()).decode()

with driver.session() as session:
    session.run("MATCH (n) DETACH DELETE n")
    print("✓ Cleared existing data")

    now = datetime.now()

    # ── Musicians ──
    musicians = [
        {"id": str(uuid.uuid4()), "name": "The Jazz Cats", "email": "jazzcats@test.com",
         "bio": "A seasoned jazz trio from Brooklyn. Sax, bass, drums.", "location": "Brooklyn, NY",
         "genres": ["Jazz", "Blues", "Soul"], "vibes": ["Sophisticated", "Energetic"],
         "minimumFee": "$500", "willingToTravel": True, "websiteUrl": "https://jazzcats.example.com",
         "instagramHandle": "@thejazzcats"},
        {"id": str(uuid.uuid4()), "name": "Electric Dreams", "email": "edreams@test.com",
         "bio": "Electronic duo with live visuals. Perfect for clubs and festivals.", "location": "Manhattan, NY",
         "genres": ["Electronic", "Indie", "Pop"], "vibes": ["Energetic", "Dreamy"],
         "minimumFee": "$800", "willingToTravel": True, "websiteUrl": "https://edreams.example.com",
         "instagramHandle": "@electricdreams"},
        {"id": str(uuid.uuid4()), "name": "Sofia's String Quartet", "email": "sofia@test.com",
         "bio": "Classical string quartet. Weddings, corporate events, venues.", "location": "New York, NY",
         "genres": ["Classical", "Folk", "Ambient"], "vibes": ["Elegant", "Chill", "Romantic"],
         "minimumFee": "$1,200", "willingToTravel": False, "websiteUrl": "", "instagramHandle": "@sofiaquartet"},
        {"id": str(uuid.uuid4()), "name": "The Rusty Nails", "email": "rusty@test.com",
         "bio": "Gritty rock band with blues influences. High energy live show.", "location": "Brooklyn, NY",
         "genres": ["Rock", "Blues", "Alternative"], "vibes": ["Energetic", "Raw", "Loud"],
         "minimumFee": "$350", "willingToTravel": True, "websiteUrl": "https://rustynails.example.com",
         "instagramHandle": "@therustynails"},
        {"id": str(uuid.uuid4()), "name": "Moonlight Sonata Trio", "email": "moonlight@test.com",
         "bio": "Piano, violin, and cello. Classical and contemporary covers.", "location": "Manhattan, NY",
         "genres": ["Classical", "Jazz", "Ambient"], "vibes": ["Elegant", "Romantic", "Chill"],
         "minimumFee": "$900", "willingToTravel": True, "websiteUrl": "", "instagramHandle": "@moonlighttrio"},
    ]
    for m in musicians:
        session.run("""
            CREATE (m:Musician {id: $id, name: $name, email: $email, password: $password,
                bio: $bio, location: $location, profileImageUrl: '', genres: $genres, vibes: $vibes,
                minimumFee: $minimumFee, willingToTravel: $willingToTravel,
                websiteUrl: $websiteUrl, instagramHandle: $instagramHandle,
                createdAt: $now, updatedAt: $now})
        """, password=PW, now=now, **m)
    print(f"✓ Created {len(musicians)} musicians")

    # ── Venues ──
    venues = [
        {"id": str(uuid.uuid4()), "venueName": "The Blue Note", "email": "booking@bluenote.com",
         "description": "Iconic jazz club in Greenwich Village.", "location": "New York, NY",
         "capacity": 200, "genrePreferences": ["Jazz", "Blues", "Soul", "Funk"],
         "ambience": ["Intimate", "Sophisticated"], "typicalBudget": "$500-$2,000",
         "liveMusic": True, "websiteUrl": "https://bluenote.com", "bookingEmail": "booking@bluenote.com"},
        {"id": str(uuid.uuid4()), "venueName": "Bowery Ballroom", "email": "bookings@bowery.com",
         "description": "Historic venue in the East Village. Indie and rock.", "location": "Manhattan, NY",
         "capacity": 575, "genrePreferences": ["Rock", "Indie", "Alternative", "Electronic"],
         "ambience": ["Energetic", "Raw"], "typicalBudget": "$1,000-$5,000",
         "liveMusic": True, "websiteUrl": "https://boweryballroom.com", "bookingEmail": ""},
        {"id": str(uuid.uuid4()), "venueName": "The Rooftop Lounge", "email": "events@rooftop.com",
         "description": "Upscale rooftop bar with skyline views. Live music weekends.", "location": "Brooklyn, NY",
         "capacity": 80, "genrePreferences": ["Jazz", "Ambient", "Folk", "Classical"],
         "ambience": ["Romantic", "Chill", "Upscale"], "typicalBudget": "$300-$1,000",
         "liveMusic": True, "websiteUrl": "https://rooftoplounge.example.com", "bookingEmail": "music@rooftop.com"},
        {"id": str(uuid.uuid4()), "venueName": "St. Mazie", "email": "info@stmazie.com",
         "description": "Cozy Williamsburg bar with live music in the back room.", "location": "Brooklyn, NY",
         "capacity": 100, "genrePreferences": ["Jazz", "Folk", "Indie", "Blues", "Rock"],
         "ambience": ["Intimate", "Chill"], "typicalBudget": "$200-$800",
         "liveMusic": True, "websiteUrl": "https://stmazie.com", "bookingEmail": "bookings@stmazie.com"},
        {"id": str(uuid.uuid4()), "venueName": "Mercury Lounge", "email": "info@mercurylounge.com",
         "description": "Small but legendary LES venue. Emerging artists.", "location": "Manhattan, NY",
         "capacity": 250, "genrePreferences": ["Rock", "Indie", "Alternative", "Electronic", "Pop"],
         "ambience": ["Energetic", "Raw"], "typicalBudget": "$400-$1,500",
         "liveMusic": True, "websiteUrl": "https://mercuryloungenyc.com", "bookingEmail": ""},
    ]
    for v in venues:
        session.run("""
            CREATE (v:Venue {id: $id, venueName: $venueName, email: $email, password: $password,
                description: $description, location: $location, logoUrl: '', capacity: $capacity,
                genrePreferences: $genrePreferences, ambience: $ambience,
                typicalBudget: $typicalBudget, liveMusic: $liveMusic,
                websiteUrl: $websiteUrl, bookingEmail: $bookingEmail,
                createdAt: $now, updatedAt: $now})
        """, password=PW, now=now, **v)
    print(f"✓ Created {len(venues)} venues")

    # ── Promoters ──
    promoters = [
        {"id": str(uuid.uuid4()), "businessName": "LiveWire Promotions", "email": "alex@livewire.com",
         "bio": "Indie NYC promoter. Rock and electronic shows.", "location": "New York, NY",
         "genreSpecialties": ["Indie", "Rock", "Electronic"], "eventTypes": ["Concerts", "Club Nights"],
         "acceptingNewArtists": True, "currentRosterSize": 12,
         "websiteUrl": "https://livewire.example.com", "phone": "555-0100"},
        {"id": str(uuid.uuid4()), "businessName": "Jazz Coast Booking", "email": "info@jazzcoast.com",
         "bio": "Boutique jazz/soul agency. Northeast US.", "location": "Brooklyn, NY",
         "genreSpecialties": ["Jazz", "Soul", "Blues", "Funk"], "eventTypes": ["Concerts", "Festivals", "Corporate"],
         "acceptingNewArtists": True, "currentRosterSize": 8,
         "websiteUrl": "https://jazzcoast.example.com", "phone": "555-0200"},
        {"id": str(uuid.uuid4()), "businessName": "Classical Connections", "email": "hello@classicalconnects.com",
         "bio": "Full-service classical booking. Orchestras, quartets, soloists.", "location": "Manhattan, NY",
         "genreSpecialties": ["Classical", "Opera", "Ambient"], "eventTypes": ["Concerts", "Weddings", "Corporate"],
         "acceptingNewArtists": False, "currentRosterSize": 25,
         "websiteUrl": "https://classicalconnects.example.com", "phone": "555-0300"},
    ]
    for p in promoters:
        session.run("""
            CREATE (p:Promoter {id: $id, businessName: $businessName, email: $email, password: $password,
                bio: $bio, location: $location, logoUrl: '',
                genreSpecialties: $genreSpecialties, eventTypes: $eventTypes,
                acceptingNewArtists: $acceptingNewArtists, currentRosterSize: $currentRosterSize,
                websiteUrl: $websiteUrl, phone: $phone,
                createdAt: $now, updatedAt: $now})
        """, password=PW, now=now, **p)
    print(f"✓ Created {len(promoters)} promoters")

driver.close()
print("\n✓ Database seeded! 5 musicians, 5 venues, 3 promoters.")

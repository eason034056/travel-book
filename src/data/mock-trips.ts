import type { TripDetail } from "@/types/travel";

export const trips: TripDetail[] = [
  {
    id: "kyoto-2026",
    title: "Kyoto in April",
    startDate: "2026-04-12",
    endDate: "2026-04-16",
    timezone: "Asia/Tokyo",
    summary: "Lantern alleys, river pauses, and slow shrine mornings",
    coverPhotoUrl:
      "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80",
    travelCompanions: ["Wyu", "Mina"],
    daysCount: 5,
    stopCount: 14,
    highlightLabel: "The trip we learned to walk slower.",
    routeSummary: "Fushimi Inari -> Sannenzaka -> Gion -> Arashiyama -> Kyoto Station",
    mapCenter: [135.7751, 35.0116],
    endingPhotoIds: ["kyoto-day-1-photo-2", "kyoto-day-2-photo-1", "kyoto-day-1-photo-1"],
    days: [
      {
        id: "kyoto-day-1",
        dayIndex: 1,
        date: "2026-04-12",
        cityLabel: "Kyoto",
        title: "Shrine gates and first-light coffee",
        summary: "We started at Fushimi Inari before the crowds and let the city wake up around us.",
        highlightMoment: "Orange torii gates turning quiet again after sunrise.",
        heroPhotoUrl:
          "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1400&q=80",
        journal:
          "We kept the first day intentionally loose: one shrine, one coffee break, and enough space to get happily lost.",
        stops: [
          {
            id: "stop-1",
            name: "Fushimi Inari Taisha",
            lat: 34.9671,
            lng: 135.7727,
            orderIndex: 0,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Fushimi+Inari+Taisha"
          },
          {
            id: "stop-2",
            name: "Kurasu Kyoto Stand",
            lat: 34.9853,
            lng: 135.7583,
            orderIndex: 1,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Kurasu+Kyoto+Stand"
          }
        ],
        gallery: [
          {
            id: "kyoto-day-1-photo-1",
            url: "https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=900&q=80",
            alt: "Shrine gate pathway",
            capturedAt: "2026-04-12T07:15:00+09:00"
          },
          {
            id: "kyoto-day-1-photo-2",
            url: "https://images.unsplash.com/photo-1492571350019-22de08371fd3?auto=format&fit=crop&w=900&q=80",
            alt: "Coffee by the station",
            capturedAt: "2026-04-12T09:20:00+09:00"
          }
        ]
      },
      {
        id: "kyoto-day-2",
        dayIndex: 2,
        date: "2026-04-13",
        cityLabel: "Higashiyama",
        title: "Temple lanes into blue hour",
        summary: "Stone steps, matcha breaks, and a route that turned into evening almost without warning.",
        highlightMoment: "The first lanterns switching on in Gion while we were still talking.",
        heroPhotoUrl:
          "https://images.unsplash.com/photo-1472396961693-142e6e269027?auto=format&fit=crop&w=1400&q=80",
        journal:
          "This was the day that felt most like Kyoto in films. We walked without urgency and took too many photos of roofs and shadows.",
        stops: [
          {
            id: "stop-3",
            name: "Kiyomizu-dera",
            lat: 34.9948,
            lng: 135.785,
            orderIndex: 0,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Kiyomizu-dera"
          },
          {
            id: "stop-4",
            name: "Starbucks Coffee Kyoto Sannenzaka Yasaka Chaya",
            lat: 34.9982,
            lng: 135.7801,
            orderIndex: 1,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Starbucks+Coffee+Kyoto+Sannenzaka+Yasaka+Chaya"
          },
          {
            id: "stop-5",
            name: "Gion Shirakawa",
            lat: 35.0046,
            lng: 135.7751,
            orderIndex: 2,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Gion+Shirakawa"
          }
        ],
        gallery: [
          {
            id: "kyoto-day-2-photo-1",
            url: "https://images.unsplash.com/photo-1542640244-7e672d6cef4e?auto=format&fit=crop&w=900&q=80",
            alt: "Temple lane in Kyoto",
            capturedAt: "2026-04-13T13:10:00+09:00"
          },
          {
            id: "kyoto-day-2-photo-2",
            url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=900&q=80",
            alt: "Evening lights",
            capturedAt: "2026-04-13T18:05:00+09:00"
          }
        ]
      }
    ]
  },
  {
    id: "lisbon-2025",
    title: "Lisbon in October",
    startDate: "2025-10-03",
    endDate: "2025-10-07",
    timezone: "Europe/Lisbon",
    summary: "Tram bells, tiled facades, and long Atlantic dinners",
    coverPhotoUrl:
      "https://images.unsplash.com/photo-1513735492246-483525079686?auto=format&fit=crop&w=1400&q=80",
    travelCompanions: ["Wyu", "Mina"],
    daysCount: 4,
    stopCount: 11,
    highlightLabel: "A city that looked hand-painted from every hill.",
    routeSummary: "Alfama -> Baixa -> Belém -> Cais do Sodré",
    mapCenter: [-9.1427, 38.7369],
    endingPhotoIds: ["lisbon-photo-1"],
    days: [
      {
        id: "lisbon-day-1",
        dayIndex: 1,
        date: "2025-10-03",
        cityLabel: "Alfama",
        title: "Tram windows and tiled walls",
        summary: "We spent the whole afternoon climbing stairs, chasing light, and pretending not to be lost.",
        highlightMoment: "A yellow tram appearing right when the street finally went quiet.",
        heroPhotoUrl:
          "https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1400&q=80",
        journal:
          "Lisbon felt generous from the start. Even our detours were photogenic, which was honestly suspicious.",
        stops: [
          {
            id: "lisbon-stop-1",
            name: "Miradouro de Santa Luzia",
            lat: 38.7111,
            lng: -9.1306,
            orderIndex: 0,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Miradouro+de+Santa+Luzia"
          },
          {
            id: "lisbon-stop-2",
            name: "Rua da Bica",
            lat: 38.7093,
            lng: -9.1464,
            orderIndex: 1,
            sourceType: "place",
            originalUrl: "https://www.google.com/maps/place/Rua+da+Bica"
          }
        ],
        gallery: [
          {
            id: "lisbon-photo-1",
            url: "https://images.unsplash.com/photo-1470123808288-1e59739b4b92?auto=format&fit=crop&w=900&q=80",
            alt: "Lisbon tram",
            capturedAt: "2025-10-03T14:20:00+01:00"
          }
        ]
      }
    ]
  }
];

export function getTripById(tripId: string) {
  return trips.find((trip) => trip.id === tripId);
}


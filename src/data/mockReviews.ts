import type { Review } from '../types';

export const mockReviews: Review[] = [
  // p1 — Sony Camera
  {
    id: 'r1', authorId: 'u10', authorName: 'Anjali Desai',
    authorAvatar: 'https://i.pravatar.cc/150?img=40',
    productId: 'p1', rating: 5,
    title: 'Absolutely flawless camera, loved it!',
    body: 'The Sony A7 III was in pristine condition. Arjun was super responsive and the pickup was easy. Got incredible shots at the wedding I shot. Will definitely rent again.',
    createdAt: '2024-11-28', transactionType: 'rent',
  },
  {
    id: 'r2', authorId: 'u11', authorName: 'Meera Krishnan',
    authorAvatar: 'https://i.pravatar.cc/150?img=45',
    productId: 'p1', rating: 4,
    title: 'Great camera, minor issue with battery life',
    body: 'Very good condition overall and the kit lens is sharp. One of the two batteries didn\'t hold charge well but the owner refunded a small portion. Would recommend.',
    createdAt: '2024-10-15', transactionType: 'rent',
  },
  {
    id: 'r3', authorId: 'u5', authorName: 'Sneha Patel',
    authorAvatar: 'https://i.pravatar.cc/150?img=16',
    productId: 'p1', rating: 5,
    title: 'Rented for a trek — stunning results',
    body: 'Used this for a Himachal trip. The image quality is just phenomenal. Arjun even gave me a quick tip on settings before I left. Highly recommend this listing.',
    createdAt: '2024-09-02', transactionType: 'rent',
  },

  // p3 — MacBook Pro
  {
    id: 'r4', authorId: 'u7', authorName: 'Deepa Iyer',
    authorAvatar: 'https://i.pravatar.cc/150?img=25',
    productId: 'p3', rating: 5,
    title: 'M2 Pro handled everything I threw at it',
    body: 'Needed it for a week of video editing. Rohan had it cleaned and ready, all apps removed. The performance is insane — rendered a 4K project in minutes. Perfect experience.',
    createdAt: '2024-12-08', transactionType: 'rent',
  },
  {
    id: 'r5', authorId: 'u6', authorName: 'Kiran Raj',
    authorAvatar: 'https://i.pravatar.cc/150?img=20',
    productId: 'p3', rating: 4,
    title: 'Very reliable, great for design work',
    body: 'Used it for a UI project over 5 days. Incredibly fast and the display is gorgeous. Slight scratch on the lid but was disclosed upfront. Transaction was smooth.',
    createdAt: '2024-11-19', transactionType: 'rent',
  },

  // p4 — Trek Bicycle
  {
    id: 'r6', authorId: 'u9', authorName: 'Rahul Dsouza',
    authorAvatar: 'https://i.pravatar.cc/150?img=33',
    productId: 'p4', rating: 5,
    title: 'Perfect city commuter, brakes are excellent',
    body: 'Rented for 2 weeks while my bike was being serviced. The gears shift buttery smooth. Sneha even provided a lock and pump. Outstanding service.',
    createdAt: '2024-10-30', transactionType: 'rent',
  },
  {
    id: 'r7', authorId: 'u3', authorName: 'Priya Nair',
    authorAvatar: 'https://i.pravatar.cc/150?img=5',
    productId: 'p4', rating: 4,
    title: 'Good bike, comfortable ride',
    body: 'The Trek is a solid hybrid. Did about 20km/day for a week. The saddle is comfortable and the disc brakes give real confidence. Helmet was a nice add-on.',
    createdAt: '2024-09-21', transactionType: 'rent',
  },

  // p8 — GoPro
  {
    id: 'r8', authorId: 'u4', authorName: 'Rohan Sharma',
    authorAvatar: 'https://i.pravatar.cc/150?img=8',
    productId: 'p8', rating: 5,
    title: 'Incredible for a scuba diving trip in Goa',
    body: 'The HyperSmooth stabilisation made all the difference in choppy water. Came with everything I needed — 3 batteries was more than enough for a full day. Highly recommend Rahul!',
    createdAt: '2024-09-05', transactionType: 'rent',
  },
  {
    id: 'r9', authorId: 'u2', authorName: 'Arjun Mehta',
    authorAvatar: 'https://i.pravatar.cc/150?img=11',
    productId: 'p8', rating: 5,
    title: 'Best way to capture adventure shots',
    body: 'Used this for paragliding in Bir. The footage quality is unreal and the wide angle is perfect for action. The SD card had test footage left on it which I just deleted — no big deal.',
    createdAt: '2024-08-27', transactionType: 'rent',
  },

  // p10 — DJI Mini 3 Pro
  {
    id: 'r10', authorId: 'u8', authorName: 'Vivek Anand',
    authorAvatar: 'https://i.pravatar.cc/150?img=30',
    productId: 'p10', rating: 5,
    title: 'Jaw-dropping aerial footage for my film',
    body: 'Rented for a short film shoot over a weekend in Coorg. The Mini 3 Pro is incredibly easy to fly and the 4K footage is cinema-grade. Arjun briefed me well on the controls. A+',
    createdAt: '2024-12-18', transactionType: 'rent',
  },
];

export function getReviewsForProduct(productId: string): Review[] {
  return mockReviews.filter(r => r.productId === productId);
}

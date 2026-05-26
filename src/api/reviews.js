import { db, findRideById, findDriverById, findUserById, newId } from './mockDb';
import { appendAudit } from '../security/audit';
import { can } from '../security/rbac';
import { useMocks } from '../config';
import { pushLocalNotification } from '../services/notifications.service';
import { gql, gqlList } from './graphql';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function submitReview({ actor, rideId, driverId, rating, comment }) {
  if (!useMocks) return gql('SubmitReview', { rideId, driverId, rating, comment });
  await sleep(180);

  if (!can(actor?.role, 'rides:book')) return { ok: false, error: 'Forbidden' };
  
  if (rating < 1 || rating > 5) return { ok: false, error: 'Rating must be between 1 and 5' };

  const ride = findRideById(rideId);
  if (!ride) return { ok: false, error: 'Ride not found' };

  if (ride.status !== 'completed') {
    return { ok: false, error: 'You can only rate a completed ride' };
  }

  // Check if user already reviewed
  const existingReview = db.reviews.find(
    (r) => r.ride_id === rideId && r.user_id === actor.id
  );
  if (existingReview) {
    return { ok: false, error: 'You have already rated this ride' };
  }

  // Check if user actually had a confirmed reservation for this ride
  const reservation = db.reservations.find(
    (r) => r.ride_id === rideId && r.user_id === actor.id && (r.status === 'confirmed' || r.status === 'completed')
  );
  if (!reservation && actor.role !== 'admin') {
    return { ok: false, error: 'You did not ride with this driver' };
  }

  const reviewId = newId();
  const review = {
    id: reviewId,
    ride_id: rideId,
    driver_id: driverId,
    user_id: actor.id,
    rating: Number(rating),
    comment: comment?.trim() || null,
    created_at: new Date().toISOString(),
  };

  db.reviews.push(review);

  // Recalculate driver rating
  const driver = findDriverById(driverId);
  if (driver) {
    const allDriverReviews = db.reviews.filter((r) => r.driver_id === driverId);
    if (allDriverReviews.length > 0) {
      const sum = allDriverReviews.reduce((acc, r) => acc + r.rating, 0);
      driver.rating = sum / allDriverReviews.length;
    } else {
      driver.rating = Number(rating);
    }
  }

  appendAudit({
    actorId: actor.id,
    actorRole: actor.role,
    action: 'review.submitted',
    targetEntity: 'driver',
    targetId: driverId,
    metadata: { rideId, rating },
  });

  // Since we are mocking the driver being on the same device right now
  // for demo purposes, we can push a notification to show it works
  pushLocalNotification({
    title: 'New Rating!',
    body: `You received a ${rating}★ rating from a passenger.`,
    data: { screen: 'Dashboard' },
  });

  return { ok: true, review };
}

export async function getReviewForRide({ actor, rideId }) {
  if (!useMocks) return gql('GetReviewForRide', { rideId });
  await sleep(60);
  
  if (!actor) return null;
  const review = db.reviews.find(
    (r) => r.ride_id === rideId && r.user_id === actor.id
  );
  
  return review || null;
}

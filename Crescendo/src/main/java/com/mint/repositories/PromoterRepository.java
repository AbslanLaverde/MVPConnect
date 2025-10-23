package com.mint.repositories;

import java.security.NoSuchAlgorithmException;
import java.util.List;

import javax.inject.Inject;
import javax.persistence.TypedQuery;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import com.mint.entities.Band;
import com.mint.entities.BandGigs;
import com.mint.entities.BandGigsPK;
import com.mint.entities.Credentials;
import com.mint.entities.Gig;
import com.mint.entities.Promoter;

@Repository
public class PromoterRepository {
	
	
	SessionFactory sf;
	
	
	@Inject
	public PromoterRepository(SessionFactory sf) {
		this.sf = sf;
	}



	@Transactional
	public Promoter create(Promoter promoter) {
		Session session = sf.getCurrentSession();
		session.save(promoter);
		return promoter;
	}


	@Transactional(propagation = Propagation.REQUIRED)
	public Promoter login(Credentials credentials) throws NoSuchAlgorithmException {
		Session session = sf.getCurrentSession();
		
		
		List<Promoter> promoterList = session.createQuery("Select p from Promoter p where p.email = :email").setParameter("email", credentials.getEmail()).list();
		Promoter promoter = promoterList.get(0);
		if(promoter.getHashedPassword().equals(credentials.getHashedPassword())) {
			return promoter;
		}
		else{
			
			return null ;
		}
	}
 


	public Promoter update(Promoter promoter) {
		return null;
	}


	@Transactional(propagation = Propagation.REQUIRED)
	public Promoter getById(int id) {
		Session session = sf.getCurrentSession();
		return session.get(Promoter.class, id);
		
	}
	

	@Transactional(propagation = Propagation.REQUIRED)
	public Promoter delete(int id) {
		return null;
	}


	@Transactional(propagation = Propagation.REQUIRED)
	public List<Gig> getGigs(int id) {
		Session session = sf.getCurrentSession();
		String query = "FROM Gig where promoter_id = :id";
		List<Gig> gigList = session.createQuery(query, Gig.class).setParameter("id", id).list();
		return gigList;	
	}


	@Transactional(propagation = Propagation.REQUIRED)
	public void inviteBand(int bandId, int gigId) {
		Session session = sf.getCurrentSession();
		String bandQuery="FROM Band b where b.id = :bandId";
		List<Band> band = session.createQuery(bandQuery, Band.class).setParameter("bandId", bandId).list();
		String gigQuery = "FROM Gig g where g.id = :gigId";
		List<Gig> gig = session.createQuery(gigQuery, Gig.class).setParameter("gigId", gigId).list();
		BandGigsPK pk = new BandGigsPK(bandId,gigId);
		BandGigs bg = new BandGigs(pk, band.get(0), gig.get(0), "Pending");
		session.persist(bg);
		
	}

	@Transactional(propagation = Propagation.REQUIRED)
	public List<Band> getAllBands() {
		Session session = sf.getCurrentSession();
		String query = "FROM Band";
		List<Band> bands = session.createQuery(query, Band.class).list();
		return bands;
		
	}

}
